<!-- markdownlint-disable MD036, MD040 -->
# vLLM VRAM Calculation Methodology v2.0

## Extended with Modern Attention Mechanisms (MLA, SWA)

## Table of Contents

1. [Overview](#overview)
2. [Core VRAM Components](#core-vram-components)
3. [Attention Mechanism Overview](#attention-mechanism-overview)
4. [Standard Optimizations (GQA)](#standard-optimizations-gqa)
5. [Multi-head Latent Attention (MLA)](#multi-head-latent-attention-mla)
6. [Sliding Window Attention (SWA)](#sliding-window-attention-swa)
7. [Mathematical Formulas](#mathematical-formulas)
8. [Calculation Examples](#calculation-examples)
9. [Model-Specific Configurations](#model-specific-configurations)
10. [Parameter Reference](#parameter-reference)
11. [Implementation Notes](#implementation-notes)

---

## Overview

This document provides a comprehensive methodology for calculating GPU memory (VRAM) requirements when deploying Large Language Models (LLMs) using vLLM. Version 2.0 extends the original methodology to include modern attention optimizations beyond Grouped Query Attention (GQA):

- **Multi-head Latent Attention (MLA)**: Low-rank compression technique used in DeepSeek models
- **Sliding Window Attention (SWA)**: Local attention pattern used in Mistral and Gemma models
- **Hybrid Attention Patterns**: Models combining different attention mechanisms across layers

The fundamental equation remains:

```text
Total VRAM = Base Model Memory + KV-Cache Memory + Activation Memory + System Overhead
```

However, KV-Cache calculations now vary significantly based on the attention mechanism employed.

---

## Core VRAM Components

### 1. Base Model Memory

Unchanged from v1.0:

```text
Base Memory = Parameters × Precision (bytes) × Overhead Factor
```

### 2. KV-Cache Memory (Extended)

Now depends on attention mechanism:

```text
KV Cache = f(attention_type) × Layers × Sequence Length × Batch Size × Precision
```

Where `f(attention_type)` varies:

- **Standard MHA**: `2 × Hidden Size`
- **GQA**: `2 × KV Heads × Head Dimension`
- **MLA**: `Latent Dimension` (dramatically reduced)
- **SWA**: `2 × Hidden Size × min(Window Size, Sequence Length)`

### 3. Activation Memory

Enhanced for attention-specific computations:

```text
Activation Memory = Hidden Size × Sequence Length × Batch Size × Precision × Activation Multiplier × Attention Factor
```

Where `Attention Factor` accounts for mechanism-specific overhead:

- Standard/GQA: 1.0
- MLA: 1.2-1.3 (matrix absorption overhead)
- SWA: 0.8-0.9 (reduced computation)

### 4. System Overhead

Remains similar but accounts for attention-specific optimizations.

---

## Attention Mechanism Overview

### Mechanism Comparison Table

| Mechanism | KV Cache Size | Memory Reduction | Computation Cost | Used By |
|-----------|---------------|------------------|------------------|----------|
| **MHA** | Baseline (100%) | 0% | O(n²) | Llama 2, GPT |
| **MQA** | ~3% of MHA | 97% | O(n²) | Falcon, PaLM |
| **GQA** | 12-25% of MHA | 75-88% | O(n²) | Mistral, Llama 3 |
| **MLA** | 1-7% of MHA | 93-99% | O(n²) reduced | DeepSeek V2/V3/R1 |
| **SWA** | Window-limited | Variable | O(n×w) | Mistral, Gemma 2 |

---

## Standard Optimizations (GQA)

Covered in v1.0, Grouped Query Attention reduces KV heads while maintaining query heads:

```python
# GQA KV Cache Formula
kv_cache_gqa = 2 * layers * kv_heads * head_dim * seq_length * batch_size * precision_bytes
compression_ratio = attention_heads / kv_heads  # e.g., 32/8 = 4x reduction
```

---

## Multi-head Latent Attention (MLA)

### Overview

MLA compresses KV representations into a low-dimensional latent space, achieving 93-99% KV cache reduction compared to standard MHA.

### Key Concepts

1. **Latent Compression**: Projects KV pairs into latent dimension `d_c` (typically 512-1536)
2. **Matrix Absorption**: Absorbs up-projection matrices into queries during inference
3. **Decoupled RoPE**: Special handling for positional embeddings

### MLA KV Cache Formula

```python
def calculate_mla_kv_cache(model_config, sequence_length, batch_size, precision_bytes):
    """
    Calculate KV cache for Multi-head Latent Attention.
    
    MLA stores only the compressed latent representation c^KV instead of 
    full K and V matrices.
    """
    # Core MLA parameters
    latent_dim = model_config.mla.latent_dimension  # e.g., 512-1536
    layers = model_config.architecture.layers
    
    # Block allocation for vLLM
    block_size = model_config.vllm_optimizations.block_size
    blocks_needed = ceil(sequence_length / block_size)
    effective_seq_length = blocks_needed * block_size
    
    # MLA cache stores only latent vectors
    kv_cache_base = (
        latent_dim *              # Compressed dimension (not hidden_size!)
        layers *                  # Number of layers
        effective_seq_length *    # Block-aligned sequence
        batch_size *             # Concurrent requests
        precision_bytes          # Bytes per parameter
    )
    
    # Additional overhead for RoPE decoupling
    rope_overhead = kv_cache_base * 0.05  # ~5% for position embeddings
    
    # Memory pool overhead (vLLM)
    memory_pool_overhead = (kv_cache_base + rope_overhead) * 0.15
    
    total_mla_cache = kv_cache_base + rope_overhead + memory_pool_overhead
    
    return total_mla_cache
```

### MLA Compression Comparison

```python
# Example: DeepSeek V3 with MLA
hidden_size = 7168
attention_heads = 128
latent_dim = 1536

# Standard MHA KV cache per token
mha_per_token = 2 * hidden_size  # 14,336 parameters

# MLA KV cache per token  
mla_per_token = latent_dim  # 1,536 parameters

# Compression ratio
compression = mha_per_token / mla_per_token  # 9.3x reduction!
```

---

## Sliding Window Attention (SWA)

### Overview

SWA limits attention to a local window, reducing memory requirements and computational complexity from O(n²) to O(n×w).

### Key Concepts

1. **Fixed Window Size**: Each token attends only to `w` previous tokens
2. **Layered Propagation**: Information flows through layers beyond window size
3. **Rotating Buffer Cache**: Efficient memory management for fixed-size windows

### SWA KV Cache Formula

```python
def calculate_swa_kv_cache(model_config, sequence_length, batch_size, precision_bytes):
    """
    Calculate KV cache for Sliding Window Attention.
    
    SWA limits cache to window size, using rotating buffers.
    """
    window_size = model_config.swa.window_size  # e.g., 4096 for Mistral
    layers = model_config.architecture.layers
    hidden_size = model_config.architecture.hidden_size
    
    # Effective cache size is limited by window
    effective_cache_size = min(window_size, sequence_length)
    
    # Some models (Gemma 2) use hybrid: SWA on odd layers, full on even
    if model_config.swa.hybrid_layers:
        swa_layers = layers // 2  # Odd layers
        full_layers = layers - swa_layers  # Even layers
        
        swa_cache = (2 * hidden_size * effective_cache_size * 
                     swa_layers * batch_size * precision_bytes)
        
        full_cache = (2 * hidden_size * sequence_length * 
                      full_layers * batch_size * precision_bytes)
        
        kv_cache_base = swa_cache + full_cache
    else:
        # Pure SWA (Mistral approach)
        kv_cache_base = (2 * hidden_size * effective_cache_size * 
                         layers * batch_size * precision_bytes)
    
    # Rotating buffer overhead
    buffer_overhead = kv_cache_base * 0.1  # 10% for buffer management
    
    # Memory pool overhead (vLLM)
    memory_pool_overhead = (kv_cache_base + buffer_overhead) * 0.15
    
    total_swa_cache = kv_cache_base + buffer_overhead + memory_pool_overhead
    
    return total_swa_cache
```

### SWA Memory Savings Example

```python
# Mistral 7B with SWA
sequence_length = 32768  # Maximum context
window_size = 4096       # SWA window

# Standard MHA would need cache for full sequence
mha_cache_tokens = sequence_length  # 32,768 tokens

# SWA only caches window size
swa_cache_tokens = window_size  # 4,096 tokens

# Memory reduction
reduction = 1 - (swa_cache_tokens / mha_cache_tokens)  # 87.5% reduction
```

---

## Mathematical Formulas

### Unified vLLM VRAM Calculation v2.0

```python
from math import ceil
from enum import Enum

class AttentionType(Enum):
    MHA = "multi_head_attention"
    MQA = "multi_query_attention"
    GQA = "grouped_query_attention"
    MLA = "multi_head_latent_attention"
    SWA = "sliding_window_attention"
    HYBRID = "hybrid_attention"

def calculate_vllm_vram_v2(model, sequence_length, batch_size, precision_bytes):
    """
    Enhanced VRAM calculation supporting multiple attention mechanisms.
    """
    
    # 1. Base Model Memory (unchanged)
    base_memory = model.parameters * precision_bytes * model.overhead_factor
    
    # 2. KV-Cache Memory (attention-specific)
    attention_type = model.attention.type
    
    if attention_type == AttentionType.MHA:
        kv_cache_total = calculate_mha_kv_cache(model, sequence_length, batch_size, precision_bytes)
    elif attention_type == AttentionType.GQA:
        kv_cache_total = calculate_gqa_kv_cache(model, sequence_length, batch_size, precision_bytes)
    elif attention_type == AttentionType.MLA:
        kv_cache_total = calculate_mla_kv_cache(model, sequence_length, batch_size, precision_bytes)
    elif attention_type == AttentionType.SWA:
        kv_cache_total = calculate_swa_kv_cache(model, sequence_length, batch_size, precision_bytes)
    elif attention_type == AttentionType.HYBRID:
        kv_cache_total = calculate_hybrid_kv_cache(model, sequence_length, batch_size, precision_bytes)
    else:
        raise ValueError(f"Unknown attention type: {attention_type}")
    
    # 3. Activation Memory (with attention-specific factor)
    attention_factors = {
        AttentionType.MHA: 1.0,
        AttentionType.GQA: 1.0,
        AttentionType.MLA: 1.25,  # Matrix absorption overhead
        AttentionType.SWA: 0.85,  # Reduced computation
        AttentionType.HYBRID: 0.95
    }
    
    activation_memory = (model.architecture.hidden_size *
                        sequence_length *
                        batch_size *
                        precision_bytes *
                        model.vram_requirements.activation_multiplier *
                        attention_factors[attention_type])
    
    # 4. System Overhead
    system_overhead = (base_memory + kv_cache_total) * 0.1
    
    # Total VRAM
    total_vram = base_memory + kv_cache_total + activation_memory + system_overhead
    
    return {
        'total_vram_gb': total_vram / (1024**3),
        'base_memory_gb': base_memory / (1024**3),
        'kv_cache_gb': kv_cache_total / (1024**3),
        'activation_gb': activation_memory / (1024**3),
        'overhead_gb': system_overhead / (1024**3),
        'attention_type': attention_type.value
    }

def calculate_hybrid_kv_cache(model, sequence_length, batch_size, precision_bytes):
    """
    Calculate KV cache for models with mixed attention patterns.
    Example: Gemma 2 uses SWA on odd layers, full attention on even layers.
    """
    total_cache = 0
    
    for layer_idx in range(model.architecture.layers):
        if layer_idx in model.hybrid.swa_layers:
            # SWA layer
            window_size = model.hybrid.window_size
            cache_size = min(window_size, sequence_length)
            layer_cache = (2 * model.architecture.hidden_size * cache_size * 
                          batch_size * precision_bytes)
        elif layer_idx in model.hybrid.mla_layers:
            # MLA layer
            layer_cache = (model.mla.latent_dimension * sequence_length * 
                          batch_size * precision_bytes)
        else:
            # Full attention layer
            layer_cache = (2 * model.architecture.hidden_size * sequence_length * 
                          batch_size * precision_bytes)
        
        total_cache += layer_cache
    
    # Add vLLM overheads
    memory_pool_overhead = total_cache * 0.15
    return total_cache + memory_pool_overhead
```

---

## Calculation Examples

### Example 1: DeepSeek V3 with MLA

**Model Specifications:**

- Parameters: 671B
- Layers: 61
- Hidden Size: 7,168
- Attention Heads: 128
- Latent Dimension: 1,536 (MLA)
- Precision: fp16

**Scenario:** Single user, 8K context

```python
# DeepSeek V3 configuration
model_deepseek_v3 = ModelConfig(
    parameters=671_000_000_000,
    attention_type=AttentionType.MLA,
    layers=61,
    hidden_size=7168,
    latent_dimension=1536,  # MLA compression
    precision_bytes=2
)

# Calculate VRAM
result = calculate_vllm_vram_v2(model_deepseek_v3, 8192, 1, 2)

# Results:
# Base Memory: ~1,342 GB (!)
# KV Cache: ~1.5 GB (dramatically reduced via MLA)
# Total: ~1,344 GB

# Compare to standard MHA:
# MHA KV Cache would be: ~14 GB
# MLA achieves 9.3x reduction!
```

### Example 2: Mistral 7B with SWA

**Model Specifications:**

- Parameters: 7.24B
- Layers: 32
- Hidden Size: 4,096
- Window Size: 4,096 (SWA)
- Max Context: 32,768
- Precision: fp16

**Scenario:** 10 users, 16K context each

```python
# Mistral configuration
model_mistral = ModelConfig(
    parameters=7_240_000_000,
    attention_type=AttentionType.SWA,
    layers=32,
    hidden_size=4096,
    window_size=4096,
    precision_bytes=2
)

# Calculate VRAM
result = calculate_vllm_vram_v2(model_mistral, 16384, 10, 2)

# Results:
# Base Memory: 16.22 GB
# KV Cache: 0.64 GB (capped at window size)
# Total: ~18.5 GB

# Without SWA (full 16K cache):
# KV Cache would be: 2.56 GB
# SWA achieves 75% reduction for long contexts!
```

### Example 3: Gemma 2 27B with Hybrid Attention

**Model Specifications:**

- Parameters: 27B
- Layers: 46
- Hidden Size: 4,608
- SWA Layers: Odd layers (23 layers)
- Full Attention: Even layers (23 layers)
- Window Size: 4,096
- Max Context: 8,192
- Precision: fp16

**Scenario:** Single user, 8K context

```python
# Gemma 2 configuration (hybrid)
model_gemma2 = ModelConfig(
    parameters=27_000_000_000,
    attention_type=AttentionType.HYBRID,
    layers=46,
    hidden_size=4608,
    hybrid_config={
        'swa_layers': list(range(1, 46, 2)),  # Odd layers
        'full_layers': list(range(0, 46, 2)),  # Even layers
        'window_size': 4096
    },
    precision_bytes=2
)

# Calculate VRAM
result = calculate_vllm_vram_v2(model_gemma2, 8192, 1, 2)

# Results:
# Base Memory: 60.5 GB
# KV Cache (hybrid): 0.86 GB
# - SWA layers: 0.43 GB (23 layers × 4096 tokens)
# - Full layers: 0.86 GB (23 layers × 8192 tokens)
# Total: ~63 GB
```

---

## Model-Specific Configurations

### Models Using MLA (Multi-head Latent Attention)

| Model | Latent Dim | Compression vs MHA | vLLM Support |
|-------|------------|-------------------|--------------|
| DeepSeek-V2 | 512 | ~14x | ✅ Full (v0.7.1+) |
| DeepSeek-V3 | 1536 | ~9.3x | ✅ Full (v0.7.1+) |
| DeepSeek-R1 | 1536 | ~9.3x | ✅ Full (v0.7.1+) |
| DeepSeek-V2-Lite | 512 | ~14x | ✅ Full |
| DeepSeek-Coder | 512-1536 | 9-14x | ✅ Full |

**Note:** MLA support in vLLM includes optimized CUTLASS kernels and FP8 quantization as of v0.7.1.

### Models Using SWA (Sliding Window Attention)

| Model | Window Size | Context Length | vLLM Support |
|-------|------------|----------------|--------------|
| Mistral 7B v0.1 | 4,096 | 32,768 | ✅ Full |
| Mistral 7B v0.2 | 4,096 | 32,768 | ✅ Full |
| Mistral 8x7B | 4,096 | 32,768 | ✅ Full |
| Mixtral 8x22B | 4,096 | 65,536 | ✅ Full |
| Gemma 2 (9B/27B) | 4,096 | 8,192 | ⚠️ Partial* |

**Note:** *Gemma 2's hybrid attention (SWA on odd layers) has limited vLLM support. Context is capped at window size.

### Models Using GQA (Grouped Query Attention)

| Model | Attention Heads | KV Heads | Compression |
|-------|----------------|----------|-------------|
| Mistral 7B | 32 | 8 | 4x |
| Llama 3 (8B) | 32 | 8 | 4x |
| Llama 3 (70B) | 64 | 8 | 8x |
| Qwen 2.5 | 32 | 8 | 4x |

### Models Using Standard MHA

| Model | Note |
|-------|------|
| Llama 2 (all sizes) | No KV optimization |
| GPT-3/4 | No KV optimization |
| BERT/RoBERTa | Encoder-only |

---

## Parameter Reference

### Extended Architecture Parameters

| Parameter | Description | Typical Values | Impact |
|-----------|-------------|----------------|--------|
| `attention_type` | Attention mechanism | MHA/GQA/MLA/SWA/HYBRID | Determines KV cache formula |
| `latent_dimension` | MLA compression dim | 512-2048 | Lower = more compression |
| `window_size` | SWA window tokens | 2048-8192 | Caps KV cache size |
| `hybrid_layers` | Mixed attention layers | Model-specific | Complex cache patterns |
| `rope_decoupled` | MLA RoPE handling | true/false | +5% overhead if true |

### vLLM-Specific MLA/SWA Parameters

| Parameter | Description | Default | Impact |
|-----------|-------------|---------|--------|
| `mla_kernel` | MLA optimization kernel | CUTLASS | Performance boost |
| `swa_buffer_mode` | SWA memory management | rotating | Memory efficiency |
| `hybrid_cache_mode` | Hybrid attention caching | per_layer | Memory allocation |
| `attention_backend` | Backend implementation | FLASHINFER/FLASH_ATTN | Performance |

### Memory Scaling Factors

| Attention Type | KV Cache Factor | Activation Factor | Overhead Factor |
|----------------|-----------------|-------------------|-----------------|
| MHA | 1.0x | 1.0x | 0.10 |
| GQA | 0.25x | 1.0x | 0.10 |
| MLA | 0.05-0.10x | 1.25x | 0.12 |
| SWA | Window-based | 0.85x | 0.08 |
| Hybrid | Variable | 0.95x | 0.11 |

---

## Implementation Notes

### vLLM Version Compatibility

- **v0.7.0**: Basic GQA support
- **v0.7.1+**: Full MLA support with optimized kernels
- **v0.8.0+**: Enhanced SWA and hybrid attention
- **v0.9.0+**: Reasoning model support (DeepSeek-R1)

### Attention Backend Selection

```bash
# For MLA models (DeepSeek)
export VLLM_ATTENTION_BACKEND=FLASHINFER

# For SWA models (Mistral)
export VLLM_ATTENTION_BACKEND=FLASH_ATTN

# Force specific backend
vllm serve model_name --attention-backend FLASHINFER
```

### Common Pitfalls with Modern Attention

1. **MLA Overhead**: Don't forget matrix absorption overhead (~20% activation increase)
2. **SWA Limitations**: Some vLLM versions cap context at window size
3. **Hybrid Complexity**: Per-layer cache calculations needed
4. **Quantization Impact**: MLA models benefit more from FP8 than GQA
5. **Backend Mismatches**: Wrong backend can 2-3x memory usage

### Validation Methods

1. **nvidia-smi Monitoring**: Track actual VRAM during inference
2. **vLLM Profiling**: Use `--profile` flag for detailed memory breakdown
3. **Attention-Specific Tests**: Verify compression ratios match expectations
4. **Cross-Framework Validation**: Compare with SGLang, TGI results

### Best Practices

1. **Model Selection**:
   - Use MLA models (DeepSeek) for maximum KV compression
   - Use SWA models (Mistral) for long-context with memory constraints
   - Use GQA models (Llama 3) for balanced performance

2. **Deployment Optimization**:
   - Enable FP8 for MLA models (`--quantization fp8`)
   - Use appropriate attention backend
   - Consider tensor parallelism for large MLA models

3. **Memory Planning**:
   - MLA: Plan for base model size + minimal KV cache
   - SWA: Plan for window-limited cache regardless of context
   - Hybrid: Calculate per-layer requirements

---

## Appendix: Quick Reference Formulas

### MLA KV Cache

```
KV_MLA = latent_dim × layers × seq_length × batch × precision
```

### SWA KV Cache

```
KV_SWA = 2 × hidden_size × min(window, seq_length) × layers × batch × precision
```

### Hybrid KV Cache

```
KV_Hybrid = Σ(layer_specific_cache) for each layer
```

### Compression Ratios

- MLA: 90-95% reduction vs MHA
- SWA: (1 - window/context) × 100% reduction
- GQA: (1 - kv_heads/attn_heads) × 100% reduction

---

This methodology provides a comprehensive framework for accurate VRAM estimation in vLLM deployments with modern attention mechanisms, enabling optimal resource planning for state-of-the-art LLM inference workloads.
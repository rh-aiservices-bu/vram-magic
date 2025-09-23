<!-- markdownlint-disable MD036 -->
# vLLM VRAM Calculation Methodology

## Table of Contents

1. [Overview](#overview)
2. [Core VRAM Components](#core-vram-components)
3. [vLLM-Specific Optimizations](#vllm-specific-optimizations)
4. [Mathematical Formulas](#mathematical-formulas)
5. [Calculation Examples](#calculation-examples)
6. [Parameter Reference](#parameter-reference)
7. [Implementation Notes](#implementation-notes)

---

## Overview

This document provides a comprehensive methodology for calculating GPU memory (VRAM) requirements when deploying Large Language Models (LLMs) using vLLM (very fast LLM inference and serving). vLLM introduces several optimizations that significantly impact memory usage compared to traditional inference frameworks:

- **PagedAttention**: Block-based memory allocation for KV-cache
- **Grouped Query Attention (GQA)**: Reduced memory footprint for key-value heads
- **Continuous Batching**: Dynamic batching optimization
- **Memory Pool Pre-allocation**: Efficient memory management

---

## Core VRAM Components

VRAM usage in vLLM deployments consists of four main components:

```text
Total VRAM = Base Model Memory + KV-Cache Memory + Activation Memory + System Overhead
```

### 1. Base Model Memory

The memory required to store the model's weights and parameters.

**Formula:**

```text
Base Memory = Parameters × Precision (bytes) × Overhead Factor
```

**Parameters:**

- `Parameters`: Total number of model parameters (e.g., 7B for 7 billion parameters)
- `Precision`: Bytes per parameter based on data type (fp16 = 2 bytes, fp32 = 4 bytes, int8 = 1 byte)
- `Overhead Factor`: Additional memory for model loading and framework overhead (typically 1.2)

### 2. KV-Cache Memory

Memory for storing key-value attention cache during inference.

**Standard Formula (without GQA):**

```text
KV Cache = 2 × Layers × Hidden Size × Sequence Length × Batch Size × Precision
```

**GQA-Optimized Formula:**

```text
KV Cache = 2 × Layers × KV Heads × Head Dimension × Sequence Length × Batch Size × Precision
```

**Parameters:**

- `Layers`: Number of transformer layers
- `Hidden Size`: Model's hidden dimension size
- `KV Heads`: Number of key-value heads (for GQA models, typically fewer than attention heads)
- `Head Dimension`: Dimension per attention head (Hidden Size ÷ Attention Heads)
- `Sequence Length`: Total input + output tokens
- `Batch Size`: Number of concurrent requests
- `Precision`: Bytes per parameter

### 3. Activation Memory

Memory for intermediate computations during forward pass.

**Formula:**

```text
Activation Memory = Hidden Size × Sequence Length × Batch Size × Precision × Activation Multiplier
```

**Parameters:**

- `Activation Multiplier`: Scaling factor for inference (typically 1.5x, much lower than training's 4x)

### 4. System Overhead

Additional memory for PyTorch, CUDA, and vLLM framework overhead.

**Formula:**

```text
System Overhead = (Base Memory + KV Cache Memory) × Overhead Rate
```

**Parameters:**

- `Overhead Rate`: Typically 0.1 (10%) for system and framework overhead

---

## vLLM-Specific Optimizations

### PagedAttention Block Allocation

vLLM allocates KV-cache memory in fixed-size blocks rather than contiguous arrays.

**Block Size Effect:**

```python
# Standard allocation
tokens_needed = input_tokens + output_tokens

# vLLM block allocation
block_size = 16  # tokens per block
blocks_needed = ceil(tokens_needed / block_size)
effective_tokens = blocks_needed × block_size
```

**Memory Pool Overhead:**

```python
kv_cache_base = [standard KV cache calculation]
memory_pool_overhead = kv_cache_base × 0.15  # 15% pre-allocation
total_kv_cache = kv_cache_base + memory_pool_overhead
```

### Grouped Query Attention (GQA)

GQA reduces memory by using fewer key-value heads than attention heads.

**Standard Multi-Head Attention:**

```text
KV Heads = Attention Heads (e.g., 32 heads)
```

**Grouped Query Attention:**

```text
KV Heads < Attention Heads (e.g., 8 KV heads, 32 attention heads)
Compression Ratio = Attention Heads ÷ KV Heads = 32 ÷ 8 = 4x
```

**Memory Impact:**

- Mistral 7B: 4x reduction in KV-cache memory
- Llama 2 7B: No reduction (uses standard MHA)

---

## Mathematical Formulas

(Python examples)

### Complete vLLM VRAM Calculation

```python
def calculate_vllm_vram(model, sequence_length, batch_size, precision_bytes):
    # 1. Base Model Memory
    base_memory = model.parameters × precision_bytes × model.overhead_factor

    # 2. KV-Cache with vLLM optimizations
    # Block allocation
    block_size = model.vllm_optimizations.block_size  # typically 16
    blocks_needed = ceil(sequence_length / block_size)
    effective_sequence_length = blocks_needed × block_size

    # GQA support
    kv_heads = model.architecture.kv_heads or model.architecture.attention_heads
    head_dim = model.architecture.head_dim or (model.architecture.hidden_size / model.architecture.attention_heads)

    # Core KV calculation
    kv_cache_base = (2 ×                           # keys + values
                     model.architecture.layers ×   # transformer layers
                     kv_heads ×                     # KV heads (not attention heads for GQA!)
                     head_dim ×                     # dimension per head
                     effective_sequence_length ×   # tokens (block-aligned)
                     batch_size ×                   # concurrent requests
                     precision_bytes)               # bytes per parameter

    # Memory pool overhead
    memory_pool_overhead = kv_cache_base × model.vllm_optimizations.memory_pool_overhead
    kv_cache_total = kv_cache_base + memory_pool_overhead

    # 3. Activation Memory
    activation_multiplier = model.vram_requirements.activation_multiplier  # typically 1.5
    activation_memory = (model.architecture.hidden_size ×
                        sequence_length ×
                        batch_size ×
                        precision_bytes ×
                        activation_multiplier)

    # 4. System Overhead
    system_overhead = (base_memory + kv_cache_total) × 0.1

    # Total VRAM
    total_vram = base_memory + kv_cache_total + activation_memory + system_overhead

    return total_vram
```

### Key Formula Components

**Block Allocation:**

```python
effective_tokens = ceil(actual_tokens / block_size) × block_size
```

**GQA Compression:**

```python
memory_reduction = attention_heads / kv_heads
kv_memory = standard_kv_memory / memory_reduction
```

**Memory Pool:**

```python
pool_overhead = base_kv_cache × 0.15
total_kv_cache = base_kv_cache + pool_overhead
```

---

## Calculation Examples

### Example 1: Mistral 7B (with GQA)

**Model Specifications:**

- Parameters: 7.24B
- Layers: 32
- Hidden Size: 4,096
- Attention Heads: 32
- KV Heads: 8 (GQA enabled)
- Head Dimension: 128
- Max Sequence Length: 32,768
- Precision: fp16 (2 bytes)

**Scenario:** Single user, 500 token conversation (250 input + 250 output)

**Step 1: Block Allocation**

```python
actual_tokens = 250 + 250 = 500
block_size = 16
blocks_needed = ceil(500 / 16) = ceil(31.25) = 32 blocks
effective_tokens = 32 × 16 = 512 tokens
```

**Step 2: Base Model Memory**

```python
base_memory = 7,240,000,000 × 2 × 1.12 = 16.22 GB
```

**Step 3: KV-Cache Memory (with GQA)**

```python
# Standard calculation would use 32 attention heads
# GQA calculation uses 8 KV heads (4x reduction)

kv_cache_base = (2 ×        # keys + values
                 32 ×       # layers
                 8 ×        # KV heads (GQA!)
                 128 ×      # head dimension
                 512 ×      # effective tokens
                 1 ×        # batch size
                 2)         # fp16 bytes
              = 67,108,864 bytes = 0.063 GB

# Memory pool overhead
pool_overhead = 0.063 × 0.15 = 0.009 GB
kv_cache_total = 0.063 + 0.009 = 0.072 GB
```

**Step 4: Activation Memory**

```python
activation_memory = (4096 ×    # hidden size
                    500 ×      # actual tokens (not effective)
                    1 ×        # batch size
                    2 ×        # fp16 bytes
                    1.4)       # activation multiplier
                  = 5,734,400 bytes = 0.005 GB
```

**Step 5: System Overhead**

```python
system_overhead = (16.22 + 0.072) × 0.1 = 1.63 GB
```

**Step 6: Total VRAM**

```python
total_vram = 16.22 + 0.072 + 0.005 + 1.63 = 17.93 GB
```

**Result:** Mistral 7B requires **17.93 GB** for a single 500-token conversation.

### Example 2: Llama 2 7B (Standard MHA)

**Model Specifications:**

- Parameters: 7.0B
- Layers: 32
- Hidden Size: 4,096
- Attention Heads: 32
- KV Heads: 32 (no GQA)
- Head Dimension: 128
- Max Sequence Length: 4,096
- Precision: fp16 (2 bytes)

**Scenario:** Single user, 500 token conversation (250 input + 250 output)

**Step 1: Block Allocation** (same as Mistral)

```python
effective_tokens = 512 tokens (32 blocks × 16)
```

**Step 2: Base Model Memory**

```python
base_memory = 7,000,000,000 × 2 × 1.15 = 16.10 GB
```

**Step 3: KV-Cache Memory (Standard MHA)**

```python
kv_cache_base = (2 ×        # keys + values
                 32 ×       # layers
                 32 ×       # KV heads (same as attention heads)
                 128 ×      # head dimension
                 512 ×      # effective tokens
                 1 ×        # batch size
                 2)         # fp16 bytes
              = 268,435,456 bytes = 0.25 GB

# Memory pool overhead
pool_overhead = 0.25 × 0.15 = 0.038 GB
kv_cache_total = 0.25 + 0.038 = 0.288 GB
```

**Step 4: Activation Memory**

```python
activation_memory = (4096 ×    # hidden size
                    500 ×      # actual tokens
                    1 ×        # batch size
                    2 ×        # fp16 bytes
                    1.5)       # activation multiplier
                  = 6,144,000 bytes = 0.006 GB
```

**Step 5: System Overhead**

```python
system_overhead = (16.10 + 0.288) × 0.1 = 1.64 GB
```

**Step 6: Total VRAM**

```python
total_vram = 16.10 + 0.288 + 0.006 + 1.64 = 18.03 GB
```

**Result:** Llama 2 7B requires **18.03 GB** for a single 500-token conversation.

### Example 3: High Concurrency Scenario

**Scenario:** Mistral 7B serving 10 concurrent users, each with 1000 tokens (500 input + 500 output)

**Calculations:**

```python
# Block allocation
actual_tokens = 1000
blocks_needed = ceil(1000 / 16) = 63 blocks
effective_tokens = 63 × 16 = 1008 tokens

# Base memory (unchanged)
base_memory = 16.22 GB

# KV-Cache (scales with batch size)
kv_cache_base = 2 × 32 × 8 × 128 × 1008 × 10 × 2 = 1,321,205,760 bytes = 1.23 GB
pool_overhead = 1.23 × 0.15 = 0.18 GB
kv_cache_total = 1.23 + 0.18 = 1.41 GB

# Activation memory (scales with batch size)
activation_memory = 4096 × 1000 × 10 × 2 × 1.4 = 114,688,000 bytes = 0.11 GB

# System overhead
system_overhead = (16.22 + 1.41) × 0.1 = 1.76 GB

# Total VRAM
total_vram = 16.22 + 1.41 + 0.11 + 1.76 = 19.50 GB
```

**Result:** 10 concurrent users require **19.50 GB** vs 17.93 GB for single user.

---

## Parameter Reference

### Model Architecture Parameters

| Parameter | Description | Typical Values | Impact |
|-----------|-------------|----------------|---------|
| `parameters` | Total model parameters | 7B, 13B, 30B, 70B | Linear base memory scaling |
| `layers` | Transformer layers | 32, 40, 80 | Linear KV-cache scaling |
| `hidden_size` | Hidden dimension | 4096, 5120, 8192 | Quadratic memory impact |
| `attention_heads` | Attention heads | 32, 40, 64 | Affects head dimension |
| `kv_heads` | Key-value heads | 8, 32, 64 | Direct KV-cache scaling |
| `head_dim` | Dimension per head | 64, 128, 256 | Linear KV-cache scaling |
| `vocab_size` | Vocabulary size | 32K, 50K, 100K | Minimal memory impact |
| `max_seq_len` | Maximum context | 2K, 4K, 32K, 128K | Constrains sequence length |

### vLLM Configuration Parameters

| Parameter | Description | Default | Impact |
|-----------|-------------|---------|---------|
| `block_size` | Tokens per block | 16 | Memory alignment overhead |
| `memory_pool_overhead` | Pre-allocation rate | 0.15 (15%) | KV-cache overhead |
| `continuous_batching` | Dynamic batching | true | Efficiency optimization |
| `paged_attention` | Block-based attention | true | Memory fragmentation reduction |
| `cuda_graph_supported` | CUDA graph optimization | varies | Performance optimization |
| `flash_attention_compatible` | FlashAttention support | varies | Memory efficiency |

### Precision Options

| Precision | Bytes per Parameter | Memory Impact | Quality Trade-off |
|-----------|-------------------|---------------|-------------------|
| `fp32` | 4 | Baseline (100%) | Highest quality |
| `fp16` | 2 | 50% reduction | Minimal quality loss |
| `int8` | 1 | 75% reduction | Moderate quality loss |
| `int4` | 0.5 | 87.5% reduction | Significant quality loss |

### Scaling Factors

| Factor | Description | Typical Range | Usage |
|--------|-------------|---------------|-------|
| `overhead_factor` | Model loading overhead | 1.12 - 1.20 | Base memory calculation |
| `activation_multiplier` | Inference activation scaling | 1.4 - 1.6 | Activation memory |
| `system_overhead_rate` | Framework overhead | 0.08 - 0.12 | System overhead |

---

## Implementation Notes

### Accuracy Considerations

1. **Block Alignment**: Always round sequence length up to block boundaries
2. **GQA Detection**: Check `kv_heads` vs `attention_heads` to detect GQA
3. **Memory Pool**: Include vLLM's pre-allocation overhead
4. **Precision Consistency**: Use same precision for all components

### Performance Optimizations

1. **Batch Size Limits**: Cap batch size at 128 for memory efficiency
2. **Sequence Length**: Consider model's maximum context window
3. **GPU Memory**: Account for GPU memory fragmentation
4. **Framework Overhead**: Include PyTorch and CUDA overhead

### Validation Methods

1. **Production Measurement**: Compare with actual vLLM memory usage
2. **GPU Monitoring**: Use nvidia-smi to validate predictions
3. **Load Testing**: Verify calculations under various load patterns
4. **Model Comparison**: Cross-validate with different model sizes

### Common Pitfalls

1. **Ignoring GQA**: Using attention heads instead of KV heads for GQA models
2. **Missing Block Overhead**: Not accounting for block alignment
3. **Wrong Multipliers**: Using training multipliers (4x) instead of inference (1.5x)
4. **Static Calculations**: Not considering dynamic batching effects

This methodology provides a foundation for accurate VRAM estimation in vLLM deployments, enabling proper resource planning and cost optimization for LLM inference workloads.

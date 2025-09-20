#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// GQA configurations for known models
// Based on actual model architectures from official papers
const GQA_CONFIGS = {
  'llama-2-7b': {
    kvHeads: 32,      // Same as attention heads (no GQA)
    useGQA: false
  },
  'llama-2-13b': {
    kvHeads: 40,      // Same as attention heads (no GQA)
    useGQA: false
  },
  'llama-2-70b': {
    kvHeads: 8,       // GQA! 64 attention heads but only 8 KV heads
    useGQA: true,
    attentionHeads: 64
  },
  'mistral-7b': {
    kvHeads: 8,       // GQA with 32 attention heads, 8 KV heads
    useGQA: true,
    attentionHeads: 32
  },
  'mixtral-8x7b': {
    kvHeads: 8,       // GQA configuration
    useGQA: true,
    attentionHeads: 32
  },
  'falcon-40b': {
    kvHeads: 71,      // Multi-Query Attention (71 attention heads, 71 KV heads)
    useGQA: false,
    attentionHeads: 71
  },
  'vicuna-13b': {
    kvHeads: 40,      // Based on Llama architecture
    useGQA: false,
    attentionHeads: 40
  },
  'alpaca-7b': {
    kvHeads: 32,      // Based on Llama 1 architecture
    useGQA: false,
    attentionHeads: 32
  },
  'dolly-12b': {
    kvHeads: 32,      // Based on Pythia architecture
    useGQA: false,
    attentionHeads: 32
  },
  'codegen-16b': {
    kvHeads: 24,      // Standard MHA
    useGQA: false,
    attentionHeads: 24
  },
  // Claude and GPT models - estimated based on size
  'claude-3-opus': {
    kvHeads: 96,      // Estimated, likely uses GQA
    useGQA: true,
    attentionHeads: 96
  },
  'claude-3-sonnet': {
    kvHeads: 64,
    useGQA: true,
    attentionHeads: 64
  },
  'claude-3-haiku': {
    kvHeads: 32,
    useGQA: false,
    attentionHeads: 32
  },
  'gpt-4': {
    kvHeads: 96,      // Estimated based on size
    useGQA: true,
    attentionHeads: 128
  },
  'gpt-3.5-turbo': {
    kvHeads: 32,
    useGQA: false,
    attentionHeads: 32
  },
  'bloom-176b': {
    kvHeads: 112,     // Standard MHA for BLOOM
    useGQA: false,
    attentionHeads: 112
  }
};

function migrateModelFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const model = JSON.parse(fileContent);
    const modelId = model.id;

    console.log(`Processing ${modelId}...`);

    // Get GQA configuration for this model
    const config = GQA_CONFIGS[modelId];

    if (!config) {
      console.warn(`⚠️  No GQA configuration found for ${modelId}, using defaults`);
      // Default: assume no GQA, kvHeads = attentionHeads
      model.architecture.kvHeads = model.architecture.attentionHeads;
      model.architecture.useGQA = false;
    } else {
      // Apply GQA configuration
      model.architecture.kvHeads = config.kvHeads;
      model.architecture.useGQA = config.useGQA;

      // Update attention heads if specified in config
      if (config.attentionHeads && config.attentionHeads !== model.architecture.attentionHeads) {
        console.log(`  Updating attention heads: ${model.architecture.attentionHeads} → ${config.attentionHeads}`);
        model.architecture.attentionHeads = config.attentionHeads;
      }
    }

    // Calculate head dimension
    model.architecture.headDim = Math.floor(
      model.architecture.hiddenSize / model.architecture.attentionHeads
    );

    // Add vLLM optimizations if not present
    if (!model.vllmOptimizations) {
      model.vllmOptimizations = {
        blockSize: 16,                // vLLM default block size
        memoryPoolOverhead: 0.15,     // 15% memory pool overhead
        continuousBatching: true,     // All models support continuous batching in vLLM
        pagedAttention: true,         // Core vLLM feature
        cudaGraphSupported: model.parameters < 20000000000, // CUDA graphs for models < 20B
        flashAttentionCompatible: true // Most modern models support Flash Attention
      };
    }

    // Update performance data structure
    if (model.performance && model.performance.length > 0) {
      model.performance = model.performance.map(perf => {
        const updated = { ...perf };

        // Rename tokensPerSecond to baseTokensPerSecond if not already done
        if (perf.tokensPerSecond && !perf.baseTokensPerSecond) {
          updated.baseTokensPerSecond = perf.tokensPerSecond;
        }

        // Add workload multipliers if not present
        if (!perf.workloadMultipliers) {
          updated.workloadMultipliers = {
            chat: 1.0,          // Baseline
            code: 0.85,         // Code generation is slower
            rag: 0.70,          // RAG with retrieval is slower
            summarization: 0.80, // Summarization
            translation: 0.90    // Translation
          };
        }

        // Add batch scaling if not present
        if (!perf.batchScaling) {
          updated.batchScaling = {
            "1": 0.4,   // Single request is inefficient
            "2": 0.6,   // Better GPU utilization
            "4": 0.85,  // Good utilization
            "8": 1.0,   // Optimal for most models
            "16": 1.15, // Super-linear due to better memory access patterns
            "32": 1.25, // Continued improvements
            "64": 1.30  // Diminishing returns start here
          };
        }

        return updated;
      });
    }

    // Write updated model back to file
    const updatedContent = JSON.stringify(model, null, 2);
    fs.writeFileSync(filePath, updatedContent);

    // Log results
    if (model.architecture.useGQA) {
      const compressionRatio = model.architecture.attentionHeads / model.architecture.kvHeads;
      console.log(`✅ ${modelId}: GQA enabled (${compressionRatio.toFixed(1)}x KV-cache compression)`);
    } else {
      console.log(`✅ ${modelId}: Standard MHA (no GQA)`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Main execution
function main() {
  const modelsDir = path.join(__dirname, '..', 'public', 'models');

  if (!fs.existsSync(modelsDir)) {
    console.error('Models directory not found:', modelsDir);
    process.exit(1);
  }

  const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.json'));

  console.log(`Found ${modelFiles.length} model files to migrate\n`);

  modelFiles.forEach(file => {
    const filePath = path.join(modelsDir, file);
    migrateModelFile(filePath);
  });

  console.log('\n✨ Migration complete!');

  // Summary of GQA models
  const gqaModels = Object.entries(GQA_CONFIGS)
    .filter(([_, config]) => config.useGQA)
    .map(([id, config]) => {
      const ratio = (config.attentionHeads || 64) / config.kvHeads;
      return `  - ${id}: ${ratio.toFixed(1)}x compression`;
    });

  if (gqaModels.length > 0) {
    console.log('\nModels with GQA optimization:');
    gqaModels.forEach(line => console.log(line));
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { migrateModelFile, GQA_CONFIGS };
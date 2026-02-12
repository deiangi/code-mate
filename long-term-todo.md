# Long-Term TODOs for Code Mate

## Context Decoding Investigation

### Problem
The Ollama `/api/generate` endpoint returns a `context` array containing token IDs from the conversation. Currently, we track these but cannot decode them back to human-readable text.

### Findings

**No Direct Detokenize Endpoint**
- Ollama's official API (checked as of Feb 2026) does NOT provide a dedicated `/api/detokenize` or token-decoding endpoint
- The `context` array is documented as "an encoding of the conversation used in this response" but no built-in way to convert tokens back to text

### Potential Workarounds

#### Option 1: Extract Tokenizer Vocabulary from Model
- Use `/api/show` endpoint with `verbose=true` parameter to retrieve:
  - `tokenizer.ggml.tokens` - Complete token-to-text vocabulary mappings
  - `tokenizer.ggml.model` - Tokenizer algorithm (e.g., "gpt2", "llama-bpe")
  - `tokenizer.ggml.pre` - Tokenizer preprocessing type
- Manually map context token IDs using the vocabulary
- **Limitations:**
  - Token mappings may not perfectly reconstruct original text (some tokens represent partial words/special tokens)
  - Can be slow - requires fetching large tokenizer data per model
  - Different models have different tokenizers (need per-model handling)

#### Option 2: Community Solutions
- Research if existing projects have solved token decoding for Ollama
- Look into llama.cpp tokenizer libraries that Ollama uses internally
- Consider if we can wrap a tokenizer library directly

#### Option 3: Hybrid Approach
- Cache tokenizer vocabulary per model on first load
- Use cached mappings for decoding subsequent token arrays
- Graceful fallback if decoding fails

### Implementation Notes for Future
- Store tokenizer data per model to avoid repeated API calls
- Handle edge cases: unknown tokens, special tokens, etc.
- Consider displaying both raw token array AND decoded text (or just decoded as primary)
- Performance: token array can be hundreds of tokens - ensure decoding is efficient

### Next Steps (When Ready)
1. Decide which approach to pursue (likely Option 1 with caching from Option 3)
2. Create method to fetch verbose model info: `OllamaClient.getModelTokenizer(modelName)`
3. Parse tokenizer vocabulary and build lookup map
4. Implement token-to-text decoder: `decodeContextTokens(context: number[], tokenMap: Map)`
5. Integrate into ChatPanel to show decoded context (optional UI display toggle)
6. Test with actual Ollama models to verify decoding accuracy

### References
- Ollama API Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- `/api/show` endpoint section shows tokenizer data structure
- Context is currently tracked in ChatPanel but unused for display

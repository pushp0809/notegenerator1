# API Key Configuration Guide

## Overview

Video Note Architect now includes a centralized configuration system that supports multiple AI providers. You can configure API keys for different AI services and use them interchangeably throughout the application.

## Supported AI Providers

### 1. Google Gemini (Recommended)
- **Environment Variable:** `GEMINI_API_KEY`
- **Model:** `gemini-2.5-flash`
- **Features:** 1M+ context window, free tier available
- **Get API Key:** https://aistudio.google.com/apikey

### 2. OpenAI
- **Environment Variable:** `OPENAI_API_KEY`
- **Model:** `gpt-4`
- **Features:** GPT-4 and GPT-3.5 support
- **Get API Key:** https://platform.openai.com/api-keys

### 3. Anthropic Claude
- **Environment Variable:** `ANTHROPIC_API_KEY`
- **Model:** `claude-3-opus-20240229`
- **Features:** High-quality reasoning and analysis
- **Get API Key:** https://console.anthropic.com/

### 4. Cohere
- **Environment Variable:** `COHERE_API_KEY`
- **Model:** Command R+
- **Features:** Specialized retrieval and summarization
- **Get API Key:** https://dashboard.cohere.com/

### 5. Mistral AI
- **Environment Variable:** `MISTRAL_API_KEY`
- **Model:** Mistral Large
- **Features:** Efficient European AI processing
- **Get API Key:** https://console.mistral.ai/

## Quick Setup

### Step 1: Copy the environment template
```bash
cp .env.example .env
```

### Step 2: Add your API key(s)
Edit the `.env` file and add at least one API key:
```bash
# Required: At least one AI provider
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Additional providers
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### Step 3: Run the CLI
```bash
python -m video_notes process "https://youtube.com/watch?v=..."
```

## Configuration File Structure

The `.env` file supports the following sections:

### AI Provider API Keys
```bash
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
COHERE_API_KEY=
MISTRAL_API_KEY=
```

### Model Configuration
```bash
# Whisper model for local transcription
WHISPER_MODEL_SIZE=base  # Options: tiny, base, small, medium, large-v2, large-v3

# AI model selection (override defaults)
GEMINI_MODEL=gemini-2.5-flash
OPENAI_MODEL=gpt-4
ANTHROPIC_MODEL=claude-3-opus-20240229
```

### Application Settings
```bash
# Output directory for generated notes
OUTPUT_DIR=./notes

# Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Generation temperature (0.0 = deterministic, 2.0 = creative)
TEMPERATURE=0.3

# Maximum output tokens
MAX_TOKENS=4096
```

### Feature Flags
```bash
# Enable streaming output (real-time terminal rendering)
ENABLE_STREAMING=true

# Enable caching (avoid re-processing same video)
ENABLE_CACHING=false

# Cleanup temporary files after processing
CLEANUP_TEMP_FILES=true
```

## Using Configuration in Code

### Basic Usage
```python
from video_notes.config import get_config

# Get configuration instance
config = get_config()

# Access API keys
gemini_key = config.get_gemini_api_key(required=True)
openai_key = config.get_openai_api_key(required=False)

# Check available providers
providers = config.get_available_providers()
# Returns: ['gemini', 'openai'] if both are configured

# Access model settings
model = config.gemini_model  # 'gemini-2.5-flash'
temperature = config.temperature  # 0.3
```

### Advanced Usage
```python
from video_notes.config import get_config, reload_config, validate_config

# Reload configuration from environment
reload_config()

# Validate that at least one provider is configured
try:
    validate_config()
    print("Configuration is valid!")
except ConfigError as e:
    print(f"Configuration error: {e}")

# Ensure output directory exists
output_dir = config.ensure_output_dir()

# Get configuration as dictionary (excludes API keys for security)
config_dict = config.to_dict()
```

## Security Features

1. **Environment Variables:** API keys are stored in environment variables, not in code
2. **Automatic Loading:** The `.env` file is automatically loaded on startup
3. **No Logging:** API keys are never logged or exposed in error messages
4. **Validation:** The system validates that at least one provider is configured
5. **Secure Export:** The `to_dict()` method excludes API keys for safe logging

## Error Handling

### Missing API Key
If you try to use a provider without configuring its API key:
```python
MissingAPIKeyError: GEMINI_API_KEY is not set.
Get your API key at: https://aistudio.google.com/apikey
Then set it: export GEMINI_API_KEY=your_key_here
Or add it to your .env file.
```

### No Providers Configured
If no AI providers are configured:
```python
ConfigError: No AI providers configured. Set at least one API key:
  • GEMINI_API_KEY (recommended)
  • OPENAI_API_KEY
  • ANTHROPIC_API_KEY
  • COHERE_API_KEY
  • MISTRAL_API_KEY
```

### Invalid Configuration
If configuration values are invalid:
```python
InvalidConfigError: Invalid Whisper model: invalid_model.
Valid options: base, large-v2, large-v3, medium, small, tiny
```

## Testing Configuration

Run the configuration tests:
```bash
pytest tests/test_config.py -v
```

This will test:
- Default values
- API key loading from environment
- Multiple provider support
- Validation logic
- Security features

## Migration from Previous Version

If you were using the old system with direct `os.environ` access:

### Before
```python
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise Error("API key not set")
```

### After
```python
from video_notes.config import get_config

config = get_config()
api_key = config.get_gemini_api_key(required=True)
```

## Best Practices

1. **Use .env file:** Always use a `.env` file for local development
2. **Don't commit .env:** Add `.env` to your `.gitignore`
3. **Use .env.example:** Commit `.env.example` as a template
4. **Validate on startup:** Call `validate_config()` at application startup
5. **Use required=True:** When you need a specific provider, use `required=True`
6. **Check availability:** Use `has_gemini()`, `has_openai()`, etc. to check before use

## Troubleshooting

### API Key Not Working
1. Verify the key is correct in your `.env` file
2. Check that there are no extra spaces or quotes
3. Reload the configuration: `reload_config()`
4. Verify the key works with the provider's API directly

### Configuration Not Loading
1. Ensure `.env` file is in the project root
2. Check that `python-dotenv` is installed: `pip install python-dotenv`
3. Verify the file is named exactly `.env` (not `.env.txt`)
4. Check file permissions (should be readable)

### Multiple Providers
You can configure multiple providers and switch between them:
```python
config = get_config()

if config.has_gemini():
    # Use Gemini
    notes = generate_with_gemini(content)
elif config.has_openai():
    # Fallback to OpenAI
    notes = generate_with_openai(content)
```

## Future Enhancements

- [ ] Support for additional AI providers
- [ ] Configuration file in YAML/JSON format
- [ ] Per-project configuration overrides
- [ ] Configuration validation UI
- [ ] API key rotation support
- [ ] Rate limiting configuration

## Support

For issues or questions:
1. Check the test suite: `pytest tests/test_config.py -v`
2. Review the configuration code: `video_notes/config.py`
3. Check the example file: `.env.example`
4. Open an issue on GitHub

---

**Last Updated:** 2024  
**Version:** 0.1.0

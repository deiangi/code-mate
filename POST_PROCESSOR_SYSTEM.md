# Code Mate - Post-Processor System Implementation

**Status**: ✅ COMPLETE - Ready for testing

## What Was Built

A complete **response post-processing pipeline system** that allows users to create rules to transform model responses. This enables fixing model quirks (like missing tags), extracting data, and preparing for future tool call recognition.

## Architecture

### Core Files Created

1. **`src/postProcessors.ts`**
   - Defines types: `PostProcessor`, `PostProcessorProfile`, `PostProcessorType`
   - Implements execution functions: `executePostProcessor()`, `executeProfile()`
   - Validation functions: `validatePostProcessor()`, `validatePostProcessorProfile()`
   - **Processor Types**:
     - `regex-replace`: Pattern matching and replacement
     - `add-prefix`: Add text at beginning
     - `add-suffix`: Add text at end

2. **`src/postProcessorManager.ts`**
   - `PostProcessorManager` class - handles all CRUD operations
   - Persists to VS Code settings: `code-mate.postProcessors.*`
   - Methods:
     - `createPostProcessor()`, `updatePostProcessor()`, `deletePostProcessor()`
     - `createProfile()`, `updateProfile()`, `deleteProfile()`
     - `getActiveProfile()`, `setActiveProfile()`
     - `getAllPostProcessors()`, `getAllProfiles()`

3. **`src/postProcessorUI.ts`**
   - `PostProcessorUI` class - webview-based UI for management
   - Two-section interface:
     - **Post-Processors Tab**: Create/manage individual rules
     - **Profiles Tab**: Group processors into profiles
   - Form validation and error handling
   - Real-time list updates

### Integration Points

4. **Modified `src/extension.ts`**
   - Initializes `PostProcessorManager` on activation
   - Exports helper functions: `getPostProcessorManager()`, `getOllamaClient()`
   - Listens for config changes and reloads post-processor data

5. **Modified `src/configPanel.ts`**
   - Added tabbed interface (Settings / Post-Processors tabs)
   - Integrated `PostProcessorUI` for processor management
   - Routes messages between webview and UI controller

6. **Modified `src/chatPanel.ts`**
   - Added imports for post-processor system
   - Integrated `PostProcessorManager` instance
   - **Profile Selector Dropdown**: Visual selector in chat input area
   - **Auto-Apply Processing**: Applies active profile to responses
   - **Post-Processing Logging**: Debug logs show original vs. processed response
   - Methods:
     - `_selectProfile()`: Sets active profile with feedback
     - `_applyPostProcessing()`: Executes profile on response text
     - `_loadProfiles()`: Loads profiles on chat initialization

7. **Modified `package.json`**
   - Added configuration schema for:
     - `code-mate.postProcessors.list` - array of processors
     - `code-mate.postProcessors.profiles` - array of profiles
     - `code-mate.postProcessors.activeProfileId` - current profile ID

## User Workflow

### Creating a Post-Processor

1. Open Config Panel (⚙️ Code Mate: Configure)
2. Switch to "Post-Processors" tab
3. Fill in processor details:
   - **Name**: "Fix thinking tags"
   - **Type**: regex-replace
   - **Pattern**: `</thinking>` (regex)
   - **Replacement**: `<thinking></thinking>`
4. Click "Create Processor"
5. Processor appears in list and is available for profiles

### Creating a Profile

1. In "Profiles" section
2. Fill in:
   - **Profile Name**: "llama3.2-profile" (optional auto-naming by model)
   - **Post-Processors**: Select checkboxes of processors to include
3. Click "Create Profile"
4. Profile saved and available in chat

### Using a Profile in Chat

1. Open Chat Panel (💬 Code Mate: Chat)
2. Profile selector dropdown visible in toolbar
3. Select profile from dropdown → auto-applies to all subsequent responses
4. Messages get processed before display
5. API Log shows original and processed versions

## Technical Details

### Storage

- **Location**: VS Code workspace/global settings
- **Keys**:
  - `code-mate.postProcessors.list` (array of all processors)
  - `code-mate.postProcessors.profiles` (array of all profiles)
  - `code-mate.postProcessors.activeProfileId` (currently selected profile)
- **Persistence**: Automatic via VS Code config system

### Processing Pipeline

1. Model returns response and streams to UI
2. After streaming completes, response collected
3. If profile active → `executeProfile()` runs all processors in sequence
4. Processed response sent to webview, replaces streamed version
5. Conversation history updates with processed text
6. API Log shows transformation

### Validation

- **Regex Patterns**: Validated before saving (catches syntax errors)
- **Required Fields**: Enforced per processor type
- **Profile Names**: Required, must be unique (enforced by UI)

## Usage Examples

### Example 1: Fix Missing `<thinking>` Tags
```
Type: regex-replace
Pattern: </thinking>
Replacement: <thinking></thinking>
```
Models that output `</thinking>` without opening tag get fixed automatically.

### Example 2: Extract JSON Responses
```
Type: regex-replace
Pattern: ^.*?(\{[^}]+\}).*$
Replacement: $1
```
Forces response to contain only JSON object.

### Example 3: Add Model Identifier
```
Type: add-prefix
Prefix: [llama3.2] 
```
Every response prefixed with model name.

## Future Enhancements

1. **Advanced Processor Types**:
   - JavaScript transformation functions
   - Conditional processing (if/else rules)
   - Named capture groups and complex replacements

2. **Tool Call Recognition**:
   - Built-in processors to extract function calls
   - Structured output validation
   - Integration with function execution

3. **UI Improvements**:
   - Visual rule builder/preview
   - Test processor against sample text
   - Import/export profiles
   - Profile templates for common models

4. **Model-Specific Auto-Loading**:
   - Auto-create/activate profile when model changes
   - Per-model default processors
   - Model behavior database

5. **Performance**:
   - Cache compiled regexes
   - Batch processing for multiple messages
   - Worker threads for large transformations

## Testing Checklist

- [ ] Create a simple regex-replace processor
- [ ] Save processor successfully
- [ ] Create a profile with the processor
- [ ] Select profile in chat
- [ ] Send a message and verify processing applied
- [ ] Check API Log shows original + processed versions
- [ ] Create second processor, add to profile
- [ ] Verify both processors run in sequence
- [ ] Delete processor, verify removed from all profiles
- [ ] Clear profile selection, verify no processing

## Files Structure

```
src/
├── extension.ts (modified - init manager, exports)
├── postProcessors.ts (new - types & execution)
├── postProcessorManager.ts (new - storage & CRUD)
├── postProcessorUI.ts (new - webview UI)
├── configPanel.ts (modified - integration)
├── chatPanel.ts (modified - apply processing)
└── ollama.ts (unchanged)

package.json (modified - added settings schema)
```

## Notes for Future Development

- All post-processor data is user-facing in workspaceconfig - can be backed up/shared
- Processing happens on responses before chat history - history stores processed text
- System is extensible - new processor types can be added to `executePostProcessor()`
- No breaking changes to existing extension functionality

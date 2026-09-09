Build a **production-grade, professional web application** called **Litely**: a privacy-first collection of powerful everyday browser utilities.

This must be a **real, usable application**, not a landing-page mockup, UI concept, toy project, or collection of placeholder buttons.

Every tool described below must actually work with realistic files and inputs.

The application should prioritize:

**Professional UX + real-world usability + privacy + speed + reliability + accessibility + responsive design.**

---

# 1. PRODUCT CONCEPT

Litely provides powerful utilities that normally require users to visit multiple websites.

Instead, provide them in one polished application:

### Image Tools

- Image Compressor
- Image Converter

### PDF Tools

- PDF Merger
- PDF Splitter
- PDF Page Extractor
- PDF Reordering

### Generators

- QR Code Generator
- Password Generator

### Image Analysis

- Color Palette Extractor

There should be **no currency/unit converter**.

---

# 2. IMPORTANT ARCHITECTURE REQUIREMENT

The application should work primarily **entirely inside the browser**.

Whenever technically possible:

- Files remain on the user's device
- Processing happens locally
- No upload to a server
- No backend required
- No database required
- No user account required
- No authentication required

The application should be deployable as a static frontend to:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages where compatible

The core functionality must not depend on a proprietary backend.

Clearly communicate this privacy model throughout the application.

Example:

> 🔒 Your files never leave your device. Processing happens locally in your browser.

Do not claim something is 100% local if a particular feature actually requires an external service.

---

# 3. DESIGN DIRECTION

The UI must look like a **premium modern SaaS/productivity application**.

Do NOT make it look like:

- A school project
- A generic Bootstrap website
- A template with random gradients
- A collection of huge colorful cards
- An AI-generated dashboard
- A basic CRUD application

Use a restrained, professional visual system.

Think:

**Linear + Raycast + modern developer tools + premium productivity software**

but create an original design rather than copying any specific product.

---

# 4. VISUAL DESIGN SYSTEM

Use:

- Clean typography
- Strong visual hierarchy
- Generous but efficient spacing
- Subtle borders
- Soft shadows
- Moderate corner radius
- Minimal gradients
- Consistent iconography
- Clear interactive states
- Excellent whitespace
- Professional neutral color palette

Avoid excessive:

- Glassmorphism
- Neon colors
- Giant gradients
- Floating blobs
- Excessive animations
- Oversized headings
- Decorative elements that interfere with usability

The tools themselves should be visually dominant.

---

# 5. DARK MODE + LIGHT MODE

Implement a complete theme system.

Include:

- Light mode
- Dark mode
- System preference

Persist the user's preference locally.

The UI must be designed intentionally for both themes rather than simply inverting colors.

Ensure:

- Proper contrast
- Readable secondary text
- Correct borders
- Correct hover states
- Correct disabled states
- Correct upload areas
- Correct dialogs
- Correct tool previews

---

# 6. GLOBAL NAVIGATION

Create a professional responsive navigation system.

Desktop:

**Litely logo | Tools | Search | Favorites | Theme | Settings**

Mobile:

- Compact header
- Menu drawer
- Search
- Theme control

The header should remain unobtrusive while working inside tools.

---

# 7. GLOBAL TOOL SEARCH

Implement actual client-side tool search.

When the user searches:

`pdf`

show:

- PDF Merger
- PDF Splitter
- PDF Extractor

When searching:

`image`

show:

- Image Compressor
- Image Converter
- Color Palette Extractor

Search should support:

- Tool name
- Description
- Keywords
- Categories

Include keyboard shortcut:

**Ctrl/Cmd + K**

to open search.

Show a command-palette-style search interface.

---

# 8. HOMEPAGE UX

Create a polished homepage.

Hero:

**Everyday tools, without the hassle.**

Supporting message:

**Fast, private utilities that run directly in your browser.**

Primary CTA:

**Explore tools**

Secondary CTA:

**How it works**

Then show the tools grouped by category.

---

# 9. TOOL CARDS

Tool cards should contain:

- Professional icon
- Tool name
- Short description
- Category
- Useful capability tags
- Open button

Examples:

### Image Compressor

Compress JPG, PNG and WebP images while controlling quality and file size.

Tags:

`JPG` `PNG` `WebP` `Batch`

### PDF Merger

Combine multiple PDFs into a single document and reorder files before merging.

Tags:

`PDF` `Merge` `Reorder`

Cards should have subtle hover interactions.

Do not overanimate.

---

# 10. IMAGE COMPRESSOR

This must be a **serious image compression tool**, not simply a quality slider.

Support:

- JPG/JPEG
- PNG
- WebP
- AVIF where browser support allows

Allow:

- Multiple file upload
- Drag & drop
- Paste image from clipboard where supported
- File picker
- Batch processing

---

## Upload Area

Create a large polished drop zone.

Example:

**Drop images here**

`or choose files`

Show supported formats and reasonable file-size guidance.

After upload, display a file queue.

---

# 11. IMAGE QUEUE

Each image should display:

- Thumbnail
- Filename
- Original dimensions
- Original size
- Format
- Processing status
- Remove button

Example:

`vacation-photo.jpg`

`4000 × 3000 · 4.82 MB · JPEG`

---

# 12. IMAGE COMPRESSION CONTROLS

Provide an advanced settings panel.

### Output format

Options:

- Keep original
- JPEG
- PNG
- WebP
- AVIF where supported

### Quality

Provide:

- Visual slider
- Numeric percentage
- Presets

Presets:

- Maximum compression
- High compression
- Balanced
- High quality
- Maximum quality

Allow manual adjustment.

---

# 13. RESIZE OPTIONS

Allow users to resize images while compressing.

Options:

- Original size
- Custom width
- Custom height
- Maximum width
- Maximum height
- Percentage scaling

Include:

**Lock aspect ratio**

When enabled, changing width automatically updates height.

Also support common presets:

- 4K
- 1440p
- 1080p
- 720p
- Instagram-style dimensions
- Custom

Do not distort images.

---

# 14. IMAGE METADATA

Provide an option:

**Remove metadata**

Explain that this can remove embedded metadata where browser processing permits.

Do not pretend to remove metadata that cannot actually be removed.

---

# 15. IMAGE COMPARISON

After processing, show:

**Before vs After**

Include:

- Original size
- New size
- Saved amount
- Percentage reduction
- Dimensions
- Format

Example:

`4.82 MB → 1.17 MB`

`75.7% smaller`

Provide a visual comparison slider where practical.

---

# 16. BATCH IMAGE PROCESSING

Allow users to process many images.

Provide:

- Select all
- Deselect all
- Remove selected
- Process selected
- Download selected
- Download all

When multiple files are generated, package them into a ZIP using a browser-compatible library.

Display progress:

`Processing 7 of 20 images...`

Do not freeze the browser UI.

Use Web Workers where useful.

---

# 17. IMAGE CONVERTER

Provide a dedicated image conversion interface.

Allow conversion between supported formats:

- JPG
- PNG
- WebP
- AVIF where supported

Features:

- Batch conversion
- Quality control
- Resize
- Background handling where format conversion requires it
- Filename preservation
- Custom filename suffix
- Download individual
- Download all as ZIP

Example:

`photo.png → photo.webp`

---

# 18. PDF TOOL SUITE

Instead of making six disconnected PDF pages, create a unified **PDF Workspace**.

Users should be able to:

- Merge
- Split
- Extract
- Reorder

with a consistent interface.

---

# 19. PDF MERGER

Allow:

- Multiple PDF uploads
- Drag & drop
- Reordering
- Remove files
- Duplicate files
- Page count display

For each PDF show:

`document.pdf`

`14 pages · 2.3 MB`

Allow users to reorder files visually.

Then:

**Merge PDFs**

Show progress.

Generate a real downloadable PDF.

---

# 20. PDF PAGE PREVIEW

Where practical, render page thumbnails.

Allow:

- Page preview
- Zoom
- Page selection
- Drag reordering

Do not load expensive PDF rendering functionality until required.

Lazy-load PDF libraries.

---

# 21. PDF SPLITTER

Provide several splitting modes.

### Extract selected pages

Example:

`1, 3, 7, 10`

### Page ranges

Example:

`1-5`

`8-12`

### Split every page

Create one PDF per page.

### Split into groups

Example:

`Every 5 pages`

Handle invalid ranges gracefully.

---

# 22. PDF PAGE EXTRACTOR

Allow users to visually select pages.

Display:

`Page 1` `Page 2` `Page 3` etc.

Allow:

- Click to select
- Shift-select where practical
- Select all
- Clear selection
- Invert selection

Then:

**Extract selected pages**

Generate a new PDF.

---

# 23. PDF PAGE REORDERING

Create a visual page grid.

Allow users to:

- Drag pages
- Reorder pages
- Delete pages
- Rotate pages if supported
- Select multiple pages
- Move selected pages

Then:

**Export reordered PDF**

Only advertise functionality that the chosen PDF library can actually perform reliably.

---

# 24. PDF JOB MANAGEMENT

For complex PDF tasks:

Show a clear processing state.

Example:

`Preparing document...`

`Processing pages...`

`Creating PDF...`

`Complete`

If something fails, provide an understandable error.

Never expose raw stack traces.

---

# 25. QR CODE GENERATOR

Create a professional QR generator with live preview.

Support:

### Content types

- URL
- Plain text
- Email
- Phone
- SMS
- Wi-Fi
- Contact/vCard
- Calendar event where practical

---

# 26. QR URL MODE

For URL mode:

Fields:

`Website URL`

Validation:

- Accept valid HTTP/HTTPS URLs
- Provide helpful validation
- Do not silently modify incorrect URLs

Live preview.

---

# 27. QR WI-FI MODE

Fields:

- Network name / SSID
- Password
- Security type:
  - WPA/WPA2
  - WEP
  - None

- Hidden network option

Generate a compatible Wi-Fi QR code.

---

# 28. QR CONTACT MODE

Support:

- Name
- Organization
- Phone
- Email
- Website
- Address where practical

Generate a standard contact QR code.

---

# 29. QR CUSTOMIZATION

Allow:

- QR size
- Foreground color
- Background color
- Error correction
- Margin
- Rounded styling where the library supports it

Provide a live preview.

Include warnings if custom colors produce insufficient contrast.

---

# 30. QR EXPORT

Allow:

- PNG
- SVG
- Copy image
- Copy encoded content

Use sensible filenames.

Example:

`litely-qr-code.png`

---

# 31. PASSWORD GENERATOR

Create a security-focused password generator.

Use:

**Web Crypto API**

for cryptographically secure random generation.

Never use predictable `Math.random()` for password generation.

---

# 32. PASSWORD OPTIONS

Support:

### Character sets

- Uppercase
- Lowercase
- Numbers
- Symbols

### Advanced options

- Password length
- Exclude ambiguous characters
- Avoid repeated characters
- Avoid similar characters
- Custom symbols
- Minimum numbers
- Minimum symbols

Prevent impossible combinations.

---

# 33. PASSWORD GENERATION MODES

Provide:

### Random password

Example:

`20-character generated password`

### Multiple passwords

Allow:

`5 / 10 / 20 / custom`

Generate them independently.

### Passphrase

Where practical, provide a word-based passphrase generator.

Allow:

- Number of words
- Separator
- Capitalization
- Optional number

Use a suitable local word list rather than requesting a server.

---

# 34. PASSWORD UX

Generated passwords should be displayed safely.

Provide:

- Copy
- Regenerate
- Show/hide
- Strength estimate
- Character count

Do not:

- Store passwords in a database
- Send passwords to an API
- Put generated passwords into analytics
- Persist generated passwords unnecessarily

Provide a clear privacy message.

---

# 35. PASSWORD STRENGTH

Provide a useful strength indicator based on measurable characteristics.

Show:

- Length
- Character variety
- Estimated entropy where appropriate

Avoid misleading claims such as:

**"This password can never be hacked."**

Instead explain that password strength depends on multiple factors.

---

# 36. COLOR PALETTE EXTRACTOR

Create a sophisticated image color analysis tool.

Support:

- Drag & drop
- File picker
- Clipboard paste where possible

After loading an image:

Show:

- Image preview
- Dominant palette
- Number of colors
- Color cards

---

# 37. PALETTE EXTRACTION MODES

Provide options such as:

- Dominant colors
- Vibrant colors
- Muted colors
- Balanced palette

Allow:

`3 / 5 / 6 / 8 / 10 / custom colors`

Use a proper color clustering/quantization algorithm rather than simply sampling random pixels.

---

# 38. COLOR INFORMATION

Each extracted color should show:

- HEX
- RGB
- HSL

Where practical also show:

- HSV
- Relative luminance
- Contrast against white
- Contrast against black

Allow:

**Click to copy HEX**

Also provide:

**Copy palette**

---

# 39. PALETTE PREVIEW

Generate a beautiful preview section showing how the palette could be used.

For example:

- Background
- Primary
- Secondary
- Accent
- Text
- Card

Do not imply that the extracted colors are semantically perfect; allow the user to adjust assignments.

---

# 40. PALETTE EDITOR

Allow users to:

- Change colors
- Delete colors
- Add colors
- Reorder colors
- Rename colors

Example:

`Primary`

`Secondary`

`Accent`

`Background`

`Text`

---

# 41. PALETTE EXPORT

Provide practical export options where feasible:

- Copy HEX list
- Copy CSS variables
- Copy JSON
- Download palette as JSON
- Download palette image
- CSS snippet

Example CSS export:

`:root { ... }`

---

# 42. RECENT TOOLS

Store only non-sensitive UI preferences locally.

For example:

- Recently opened tools
- Favorite tools
- Theme preference

Do NOT store:

- Uploaded private files
- Passwords
- PDF contents
- Sensitive image data

---

# 43. FAVORITE TOOLS

Allow users to favorite tools.

Example:

`☆ Favorite`

Favorites should appear at the top of the tools page.

Use localStorage only for harmless preferences.

---

# 44. RECENT FILES

Do NOT create a cloud file history.

If providing a "recent files" concept, keep it limited to the current browser session and metadata only where appropriate.

Never upload files just to provide history.

---

# 45. DOWNLOAD EXPERIENCE

Downloads must feel polished.

Instead of instantly disappearing after processing:

Show a result card.

Example:

**Compression complete**

`photo.webp`

`1.24 MB`

`68% smaller`

Actions:

**Download**

**Process another**

For multiple files:

**Download all**

---

# 46. FILE HANDLING

Implement robust file validation.

Check:

- MIME type
- File extension
- File size
- Actual ability to decode/process the file

Handle:

- Unsupported formats
- Corrupt files
- Empty files
- Invalid PDFs
- Processing errors

Never crash the page.

---

# 47. LARGE FILE HANDLING

For large files:

- Warn users before processing where appropriate
- Show progress
- Avoid blocking the UI
- Release object URLs
- Clean up memory
- Allow cancellation where practical

If the browser cannot safely process a file, explain why.

Do not pretend the operation succeeded.

---

# 48. MOBILE EXPERIENCE

Treat mobile as a first-class experience.

On phones:

- Full-width controls
- Large touch targets
- Bottom-sheet style advanced settings where appropriate
- Responsive previews
- Sticky primary action where useful
- No tiny drag handles
- No horizontal scrolling

The tool must remain usable on small screens.

---

# 49. ACCESSIBILITY

Support:

- Keyboard navigation
- Focus management
- Screen readers
- Semantic HTML
- ARIA labels
- Visible focus indicators
- Proper button states
- Accessible dialogs
- Accessible drag/drop alternatives

Never make drag-and-drop the only way to upload files.

---

# 50. KEYBOARD SHORTCUTS

Useful shortcuts:

`Ctrl/Cmd + K` → Search

`Esc` → Close dialog

`Ctrl/Cmd + V` → Paste image where supported

Use shortcuts only when they do not interfere with normal browser behavior.

---

# 51. COMMAND PALETTE

Create a professional command palette.

Users can search:

- Tools
- Actions
- Settings

Examples:

`Open Image Compressor`

`Open PDF Merger`

`Toggle Dark Mode`

`Generate Password`

`Clear Current Files`

This should make the application feel like a serious productivity product.

---

# 52. SETTINGS

Create a lightweight settings page/panel.

Settings:

### Appearance

- Light
- Dark
- System

### Behavior

- Confirm before clearing files
- Automatically download results
- Remember favorite tools

### Privacy

Explain:

- Browser processing
- What is stored locally
- What is never uploaded

Do not introduce unnecessary accounts.

---

# 53. ONBOARDING

Do not force users through onboarding.

Instead provide a small optional introduction explaining:

**How Litely works**

1. Choose a tool
2. Add your file/input
3. Process it locally
4. Download your result

---

# 54. EMPTY STATES

Every tool should have a carefully designed empty state.

Example:

**Nothing here yet**

Drop an image here or choose a file to begin.

Include the appropriate icon and supported formats.

---

# 55. LOADING STATES

Never leave users wondering whether something is happening.

Use:

- Skeletons
- Progress bars
- Spinners where appropriate
- Processing messages

Avoid fake progress.

If actual progress cannot be measured, use an indeterminate state rather than pretending.

---

# 56. TOAST NOTIFICATIONS

Create a consistent notification system.

Examples:

**Copied to clipboard**

**File removed**

**PDF created successfully**

**Palette copied**

**Download started**

Notifications should disappear automatically and remain accessible.

---

# 57. CONFIRMATION DIALOGS

Use confirmation dialogs only for destructive actions.

Examples:

**Remove all files?**

**This will clear the current workspace.**

Buttons:

`Cancel`

`Clear files`

Do not ask for confirmation for every tiny action.

---

# 58. ERROR DESIGN

Errors must be human-readable.

Bad:

`TypeError: Cannot read properties of undefined`

Good:

**We couldn't process this image.**

`The file may be corrupted or unsupported. Try another image.`

Provide a recovery action:

**Choose another file**

---

# 59. PRIVACY PAGE

Create a dedicated privacy page.

Explain in simple language:

- Files are processed locally whenever possible
- Files are not uploaded for browser-based tools
- Passwords are generated locally
- What localStorage is used for
- What happens if third-party services are eventually added

Do not make false privacy claims.

---

# 60. ABOUT PAGE

Create a simple About page explaining the philosophy:

**Useful tools without unnecessary complexity.**

Explain that Litely is designed around:

- Privacy
- Speed
- Accessibility
- Simplicity

---

# 61. SEO

Every tool should have its own SEO-friendly route.

Examples:

`/tools/image-compressor`

`/tools/image-converter`

`/tools/pdf-merger`

`/tools/pdf-splitter`

`/tools/qr-generator`

`/tools/password-generator`

`/tools/color-palette-extractor`

Each page needs:

- Unique title
- Meta description
- Proper H1
- Descriptive content
- Open Graph metadata
- Canonical URL
- Structured data where appropriate

Avoid keyword stuffing.

---

# 62. PERFORMANCE

Prioritize excellent performance.

Implement:

- Code splitting
- Lazy-loaded tool modules
- Lazy-loaded PDF libraries
- Web Workers for heavy operations
- Efficient image decoding
- Object URL cleanup
- Memory cleanup
- Debounced expensive operations
- Minimal dependencies

The homepage should not load every heavy processing library.

---

# 63. PWA

Where practical, make Litely installable as a Progressive Web App.

Include:

- Web app manifest
- Appropriate icons
- Offline shell
- Service worker

Important:

Offline mode should only advertise functionality that genuinely works offline.

For example:

- Password generator → offline
- Unit-independent tools → offline
- Image processing → offline
- PDF processing → offline after required libraries are cached

Do not fake offline support.

---

# 64. SECURITY

Follow secure frontend practices.

Do not:

- Evaluate arbitrary user input
- Execute uploaded files
- Inject unsanitized HTML
- Store passwords
- Expose API secrets

Use secure browser APIs.

For external links, use appropriate security attributes.

---

# 65. ANALYTICS

If analytics are included, keep them privacy-conscious.

Never send:

- File names
- File contents
- Generated passwords
- PDF contents
- Image contents

Track only anonymous product-level events if analytics are enabled.

Examples:

`tool_opened`

`compression_completed`

`qr_generated`

Avoid unnecessary tracking.

---

# 66. MONETIZATION

Prepare the UI for monetization without ruining the product.

Possible future monetization:

### Free

- All core tools
- Normal usage
- Browser-based processing

### Pro / One-time purchase

Potential benefits:

- Remove ads
- Larger batch operations
- Advanced options
- Additional export features

Do not lock basic functionality behind a paywall.

---

# 67. AD PLACEMENT

Design subtle ad containers.

Potential placements:

- Below tool workspace
- Between homepage sections
- Desktop sidebar

Never place ads:

- Inside download buttons
- Over controls
- Inside file drop zones
- In misleading positions

The product should still look professional with ads enabled.

Make ad containers collapsible/hidden when ads are not configured.

---

# 68. NO FAKE STRIPE

If payment functionality is not actually configured:

Do not create fake checkout flows.

Instead architect a clean abstraction such as:

`PaymentProvider`

so Stripe or another provider can be integrated later.

Never trust client-side state for paid access.

---

# 69. NO FAKE FUNCTIONALITY

This is critical.

Do not generate:

- Fake compression
- Fake PDF results
- Fake QR codes
- Fake password strength
- Fake color extraction
- Fake downloads
- Fake progress
- Fake payment status

Every button must have a real implementation.

If a browser limitation prevents a feature, explain the limitation rather than simulating it.

---

# 70. CODE QUALITY

Use a maintainable architecture.

Prefer reusable components:

- FileDropzone
- FileQueue
- FilePreview
- ProgressBar
- DownloadCard
- ToolHeader
- ToolSettings
- EmptyState
- ErrorState
- Toast
- Modal
- CommandPalette
- ThemeProvider

Separate:

**UI**

from

**tool logic**

from

**browser processing utilities**.

Keep individual tools modular.

---

# 71. TYPESCRIPT

Use TypeScript throughout the application.

Avoid:

`any`

unless genuinely unavoidable.

Create appropriate types for:

- Tool definitions
- File state
- Processing state
- Compression settings
- PDF operations
- QR configuration
- Password configuration
- Color data

---

# 72. TESTING

Before considering the application finished, test realistic scenarios.

### Image

- Small JPG
- Large JPG
- PNG with transparency
- WebP
- Multiple images
- Invalid image

### PDF

- One PDF
- Multiple PDFs
- Multi-page PDF
- Page extraction
- Page ranges
- Reordering
- Invalid PDF

### QR

- URL
- Wi-Fi
- Contact
- Long text
- Invalid input

### Password

- Different lengths
- Symbols disabled
- Multiple passwords
- Passphrase

### Color

- Bright image
- Dark image
- Photograph
- PNG
- Large image

---

# 73. FINAL QUALITY BAR

The finished application should feel like something that could realistically be launched publicly.

It should be:

**Professional**

**Fast**

**Reliable**

**Responsive**

**Accessible**

**Privacy-focused**

**Maintainable**

**SEO-friendly**

**Actually functional**

Do not optimize for the number of visual effects.

Optimize for:

**"I came here because I need to do something, and I can finish that task in under a minute."**

---

# FINAL INSTRUCTION TO THE CODE GENERATOR

Build the complete application.

Do not stop at the homepage.

Do not create placeholders.

Do not create mock functionality.

Implement the actual browser-side processing.

Use production-quality components, error handling, responsive layouts, loading states, empty states, download flows, accessibility, keyboard navigation, dark mode, and real-world edge-case handling.

After implementation, review the entire application as if you were a real user.

Fix:

- Broken interactions
- Overflow
- Poor mobile layouts
- Missing loading states
- Missing error states
- Incorrect buttons
- Accessibility problems
- Memory leaks
- Broken downloads
- Incorrect file handling
- Console errors
- Routing problems
- Theme inconsistencies

The result should look and behave like a **real commercial web utility product**, not an AI-generated demo.

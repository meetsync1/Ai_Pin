# 🎨 UI/UX Design System

## Color Palette

### Primary Colors

```
iOS Blue:    #007AFF  - Primary actions, links, active states
iOS Red:     #FF3B30  - Recording indicator, delete, errors
iOS Green:   #34C759  - Success messages, ready states
Purple:      #5856D6  - Secondary actions, accents
```

### Neutral Colors

```
Background:  #F5F5F5  - Main background
Card White:  #FFFFFF  - Cards, panels
Text Dark:   #333333  - Primary text
Text Medium: #666666  - Secondary text
Text Light:  #999999  - Tertiary text, captions
Border:      #E0E0E0  - Dividers, borders
```

### Semantic Colors

```
Success BG:  #E8F5E9  - Success banners
Success Text:#2E7D32  - Success messages
Error BG:    #FFEBEE  - Error banners
Error Text:  #C62828  - Error messages
Code BG:     #1E1E1E  - Code blocks (JSON/SRT)
Code Text:   #D4D4D4  - Code content
```

## Typography

### Font Sizes

```
H1 (Title):      24px  - Screen titles
H2 (Subtitle):   20px  - Section headers
H3 (Header):     18px  - Card headers
Body Large:      16px  - Primary text
Body:            15px  - Regular text
Caption:         14px  - Secondary text
Small:           12px  - Metadata, timestamps
Code:            12px  - Code blocks
```

### Font Weights

```
Bold:    700  - Headers, emphasis
Semibold: 600  - Buttons, labels
Regular:  400  - Body text
```

### Font Families

```
Default:    System Font (San Francisco on iOS, Roboto on Android)
Monospace:  Courier (iOS), monospace (Android)
```

## Spacing Scale

```
XS:   4px   - Tight spacing
S:    8px   - Compact elements
M:    12px  - Default spacing
L:    16px  - Section padding
XL:   20px  - Large gaps
XXL:  24px  - Screen margins
```

## Border Radius

```
Small:   6px   - Badges, pills
Medium:  8px   - Buttons, inputs
Large:   12px  - Cards, containers
XLarge:  60px  - Circular buttons
```

## Shadows

### Card Shadow

```
shadowColor: #000
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.1
shadowRadius: 4
elevation: 3 (Android)
```

### Button Shadow

```
shadowColor: #000
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.3
shadowRadius: 8
elevation: 8 (Android)
```

## Component Styles

### Buttons

#### Primary Button

```
Background: #007AFF
Text: #FFFFFF
Padding: 12px 24px
Border Radius: 8px
Font Weight: 600
```

#### Secondary Button

```
Background: #5856D6
Text: #FFFFFF
Padding: 12px 24px
Border Radius: 8px
Font Weight: 600
```

#### Danger Button

```
Background: #FF3B30
Text: #FFFFFF
Padding: 12px 24px
Border Radius: 8px
Font Weight: 600
```

#### Record Button (Large)

```
Background: #007AFF (idle) / #FF3B30 (recording)
Size: 120px diameter
Border Radius: 60px
Icon: 48px emoji
Text: 18px bold
Shadow: Large elevation
Animation: Pulse (scale 1.0 → 1.2)
```

### Cards

#### History Card

```
Background: #FFFFFF
Padding: 16px
Border Radius: 12px
Shadow: Card shadow
Margin Bottom: 16px
```

#### Segment Card

```
Background: #FFFFFF
Padding: 12px
Border Radius: 8px
Border Left: 3px solid #007AFF
Margin Bottom: 8px
```

### Badges

#### Status Badge

```
Background: #E3F2FD
Text: #1976D2
Padding: 4px 8px
Border Radius: 6px
Font Size: 12px
Font Weight: 600
```

### Progress Bar

```
Container:
  Height: 6px
  Background: #E0E0E0
  Border Radius: 3px

Fill:
  Height: 100%
  Background: #007AFF
  Border Radius: 3px
  Width: dynamic (0-100%)
```

### Status Indicators

#### Recording Dot

```
Size: 12px diameter
Background: #FF3B30
Border Radius: 6px
Animation: Pulse
```

#### Loading Spinner

```
Size: large (48px) / small (20px)
Color: #007AFF
```

## Screen Layouts

### Header

```
Height: iOS: 104px (60px status + 44px header)
        Android: 60px
Background: #FFFFFF
Border Bottom: 1px solid #E0E0E0
Padding: 16px
Layout: [Back] [Title] [Action]
```

### Content Area

```
Background: #F5F5F5
Padding: 16px
Scroll: Vertical
```

### Bottom Button Area

```
Background: #FFFFFF
Border Top: 1px solid #E0E0E0
Padding: 20px
```

## Animations

### Pulse Animation (Recording)

```
Duration: 1600ms (800ms each way)
Loop: Infinite
Scale: 1.0 → 1.2 → 1.0
Easing: Default
```

### Fade In

```
Duration: 300ms
Opacity: 0 → 1
Easing: ease-in-out
```

### Slide Up

```
Duration: 300ms
TranslateY: 20 → 0
Easing: ease-out
```

## Icons & Emojis

### Used Throughout

```
Microphone:    🎤  - Recording, audio
Book:          📚  - History, library
Eye:           👁️  - View action
Share:         📤  - Share action
Delete:        🗑️  - Delete action
Check:         ✅  - Success, ready
Warning:       ⚠️  - Errors, alerts
Stop:          ⏹  - Stop recording
Play:          ▶️  - Playback (future)
Settings:      ⚙️  - Configuration
Info:          ℹ️  - Information
Clock:         ⏱️  - Timer, duration
Document:      📄  - Files, transcriptions
Robot:         🤖  - AI features
```

## Accessibility

### Touch Targets

```
Minimum Size: 44px × 44px
Spacing: 8px minimum between targets
```

### Color Contrast

```
Text on White: 4.5:1 minimum (WCAG AA)
White on Primary: 4.5:1 minimum
Labels: Clear, descriptive
```

### Screen Reader

```
All buttons: Accessible labels
Images: Alt text provided
Status: Announced to screen reader
Errors: Clear announcements
```

## Responsive Breakpoints

### Small Phones

```
Width: < 375px
- Smaller padding (12px)
- Compact button text
- Single column layouts
```

### Standard Phones

```
Width: 375px - 430px
- Default spacing (16px)
- Standard button sizes
- Optimal layout
```

### Large Phones / Tablets

```
Width: > 430px
- Wider cards
- More content visible
- Increased padding (20px)
```

## Best Practices

### Layout

- Use consistent 16px padding for screens
- 12px gap between related elements
- 20px gap between sections
- Cards have 16px internal padding

### Colors

- Use semantic colors (success, error, warning)
- Maintain consistent brand colors
- Ensure sufficient contrast
- Test with color blindness simulators

### Typography

- Max 2-3 font weights per screen
- Consistent line height (1.5x font size)
- Left-align text (natural reading flow)
- Use monospace for code/data

### Interactions

- Provide visual feedback (opacity, scale)
- Animate state changes (300ms)
- Show loading states for > 200ms operations
- Disable buttons during processing

### Empty States

- Use friendly emoji icons
- Provide clear explanation
- Offer primary action
- Keep message short (< 20 words)

### Error States

- Show error icon (⚠️)
- Explain what went wrong
- Offer retry or alternative action
- Use red color sparingly

## Component Examples

### Status Bar Component

```tsx
<View style={statusBarStyles}>
  {isRecording && (
    <View style={recordingIndicatorStyles}>
      <View style={recordingDotStyles} />
      <Text style={recordingTextStyles}>Recording</Text>
    </View>
  )}
</View>
```

### Card Component

```tsx
<View style={cardStyles}>
  <TouchableOpacity onPress={onPress}>
    <View style={cardHeaderStyles}>
      <Text style={dateStyles}>{date}</Text>
      <View style={badgesStyles}>
        <View style={badgeStyles}>
          <Text style={badgeTextStyles}>{language}</Text>
        </View>
      </View>
    </View>
    <Text style={contentStyles} numberOfLines={3}>
      {content}
    </Text>
  </TouchableOpacity>
  <View style={actionsStyles}>{/* Action buttons */}</View>
</View>
```

### Progress Bar Component

```tsx
<View style={progressContainerStyles}>
  <View style={[progressBarStyles, { width: `${progress}%` }]} />
</View>
```

## Platform Differences

### iOS Specific

- Status bar padding: 60px
- System font: San Francisco
- Pull-to-refresh: Native
- Haptic feedback: Available

### Android Specific

- Status bar padding: 0px (system handles)
- System font: Roboto
- Pull-to-refresh: Native
- Elevation: Used instead of shadows

---

**Design System Version**: 1.0  
**Last Updated**: February 3, 2026  
**Maintained by**: Development Team

This design system ensures consistency across all screens and components, making the app feel polished and professional.


export const TechNoir = {
  colors: {
    // Backgrounds
    background: '#000000', // True black for OLED
    surface: '#0A0A0A', // Slightly lighter for cards
    surfaceHighlight: '#1A1A1A', // Pressed state or elevated surface
    
    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#888888',
    textTertiary: '#444444',
    
    // Borders & Lines
    border: '#222222', 
    separator: '#111111',
    
    // Accents (Monochrome)
    tint: '#FFFFFF',
    icon: '#DDDDDD',
    
    // Status
    error: '#CF6679', // Muted red
    success: '#00FF00', // Terminal green (optional, can be white for strict monochrome)
    warning: '#FFD700',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    s: 4,
    m: 12,
    l: 20,
    xl: 32,
    round: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'System', // Will map to platform defaults or custom
      bold: 'System', 
      mono: 'System',
    }
  }
};

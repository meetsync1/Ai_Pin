import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // 1. Import this
import "react-native-reanimated";

import { Colors } from "@/constants/theme";

const T = Colors.dark;

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: T.accent,
    background: T.background,
    card: T.surface,
    text: T.text,
    border: T.borderStrong,
    notification: T.accent,
  },
};

export const unstable_settings = { anchor: "(tabs)" };

export default function RootLayout() {
  return (
    /* 2. Wrap everything in GestureHandlerRootView with flex: 1 */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
          {/* Add your session detail screen here if it's in the root folder */}
          <Stack.Screen
            name="session/[id]"
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
        </Stack>
        <StatusBar style="light" backgroundColor={T.background} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

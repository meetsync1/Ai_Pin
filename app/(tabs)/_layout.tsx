import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { Colors } from "@/constants/theme";

const T = Colors.dark;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: T.surface,
          borderTopColor: T.borderStrong,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 8,
          fontWeight: "900",
          letterSpacing: 2,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "REC",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="mic" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "LIB",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="library-music" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "CAL",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="calendar-today" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

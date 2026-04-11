import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function GlobalError({ error, retry }: { error: Error; retry: () => void }) {
  const router = useRouter();

  useEffect(() => {
    // Keep a useful log for development; in production this can be hooked to Sentry.
    console.error("Global app error:", error);
  }, [error]);

  const handleResetSession = async () => {
    try {
      await AsyncStorage.removeItem("user");
    } finally {
      router.replace("/onboarding");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: "center" }}>
        <View style={{ padding: 18, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)" }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>Произошла ошибка</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 10, lineHeight: 20 }}>
            Приложение столкнулось с проблемой. Попробуйте перезапустить экран или сбросить сессию.
          </Text>

          <Text
            selectable
            style={{
              marginTop: 14,
              color: "rgba(255,255,255,0.65)",
              fontFamily: "monospace",
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {error?.message ?? "Unknown error"}
          </Text>

          <View style={{ marginTop: 16, flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            <Pressable
              onPress={retry}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: "#4F46E5",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Повторить</Text>
            </Pressable>

            <Pressable
              onPress={handleResetSession}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Сбросить вход</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

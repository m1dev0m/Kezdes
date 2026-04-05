import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function NotFound() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "#FFFFFF" }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>Страница не найдена</Text>
      <Text style={{ marginTop: 8, color: "#475569" }}>Ссылка устарела или маршрут не существует.</Text>
      <Link href="/" style={{ marginTop: 16, color: "#4F46E5", fontWeight: "700" }}>
        На главный экран
      </Link>
    </View>
  );
}


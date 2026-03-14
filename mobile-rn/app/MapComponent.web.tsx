import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MapComponent({ venues }: { venues: any[] }) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="map-outline" size={64} color="#94a3b8" />
            <Text style={{ marginTop: 16, color: '#94a3b8' }}>Карта доступна только в мобильном приложении</Text>
        </View>
    );
}

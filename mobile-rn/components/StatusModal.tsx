import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

type StatusType = 'success' | 'error' | 'warning' | 'info';

interface StatusModalProps {
    visible: boolean;
    type?: StatusType;
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
    onAction?: () => void;
}

const CONFIG: Record<StatusType, { icon: keyof typeof MaterialIcons.glyphMap; color: string; bgColor: string }> = {
    success: { icon: 'check-circle', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
    error: { icon: 'error', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
    warning: { icon: 'warning', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
    info: { icon: 'info', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
};

export default function StatusModal({
    visible,
    type = 'success',
    title,
    message,
    buttonText = 'Понятно',
    onClose,
    onAction,
}: StatusModalProps) {
    const config = CONFIG[type];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
                        <MaterialIcons name={config.icon} size={36} color={config.color} />
                    </View>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: config.color }]}
                        activeOpacity={0.85}
                        onPress={onAction || onClose}
                    >
                        <Text style={styles.buttonText}>{buttonText}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    card: {
        width: width - 64,
        backgroundColor: '#ffffff',
        borderRadius: 40,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 32,
        elevation: 20,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 50,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
    },
});

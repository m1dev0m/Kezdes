import React from 'react';
import { Image, StyleSheet, StyleProp, ImageStyle, TouchableOpacity } from 'react-native';

interface LogoProps {
    style?: StyleProp<ImageStyle>;
    onPress?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ style, onPress }) => {
    const content = (
        <Image
            source={require('../../assets/kezdes-logo.png')}
            style={[styles.logo, style]}
            resizeMode="contain"
        />
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
                {content}
            </TouchableOpacity>
        );
    }

    return content;
};

const styles = StyleSheet.create({
    logo: {
        height: 32,
        width: 100, // Default width, can be overridden by style prop
    }
});

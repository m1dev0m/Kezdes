import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapPickerProps {
    latitude: number;
    longitude: number;
    onLocationSelect: (lat: number, lon: number) => void;
}

export default function MapPicker({ latitude, longitude, onLocationSelect }: MapPickerProps) {
    const webViewRef = useRef<WebView>(null);
    const dgisKey = "a1553592-5b78-4acf-90c8-54cb438b65f4";

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <script src="https://mapgl.2gis.com/api/js/v1"></script>
            <style>
                body { margin: 0; padding: 0; }
                #map { width: 100vw; height: 100vh; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                let marker;
                const map = new mapgl.Map('map', {
                    center: [${longitude}, ${latitude}],
                    zoom: 15,
                    key: '${dgisKey}',
                });

                marker = new mapgl.Marker(map, {
                    coordinates: [${longitude}, ${latitude}],
                });

                map.on('click', (e) => {
                    const { lngLat } = e;
                    if (marker) {
                        marker.setCoordinates(lngLat);
                    } else {
                        marker = new mapgl.Marker(map, {
                            coordinates: lngLat,
                        });
                    }
                    window.ReactNativeWebView.postMessage(JSON.stringify({ 
                        type: 'locationSelect', 
                        lat: lngLat[1], 
                        lon: lngLat[0] 
                    }));
                });

                window.addEventListener('message', (e) => {
                    const data = JSON.parse(e.data);
                    if (data.type === 'centerMap') {
                        map.setCenter([data.lon, data.lat]);
                        marker.setCoordinates([data.lon, data.lat]);
                    }
                });
            </script>
        </body>
        </html>
    `;

    useEffect(() => {
        const script = `
            if (window.map) {
                map.setCenter([${longitude}, ${latitude}]);
                if (window.marker) {
                    marker.setCoordinates([${longitude}, ${latitude}]);
                }
            }
            true;
        `;
        webViewRef.current?.injectJavaScript(script);
    }, [latitude, longitude]);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'locationSelect') {
                onLocationSelect(data.lat, data.lon);
            }
        } catch (e) { }
    };

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                style={styles.webview}
                source={{ html: htmlContent }}
                onMessage={handleMessage}
                scrollEnabled={false}
                bounces={false}
                originWhitelist={['*']}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
    },
    webview: {
        flex: 1,
    }
});

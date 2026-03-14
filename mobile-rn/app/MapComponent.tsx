import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function MapComponent({ venues, onMarkerPress }: { venues: any[], onMarkerPress?: (venue: any) => void }) {
    const webViewRef = useRef<WebView>(null);
    const dgisKey = process.env.EXPO_PUBLIC_2GIS_API_KEY || '';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <script src="https://mapgl.2gis.com/api/js/v1"></script>
            <style>
                body { margin: 0; padding: 0; }
                #map { width: 100vw; height: 100vh; }
                .custom-marker {
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 4px 8px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #0f172a;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    white-space: nowrap;
                    transform: translate(-50%, -100%);
                }
                .custom-marker::after {
                    content: '';
                    position: absolute;
                    bottom: -5px;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px 5px 0;
                    border-style: solid;
                    border-color: white transparent transparent transparent;
                    z-index: 1;
                }
                .custom-marker::before {
                    content: '';
                    position: absolute;
                    bottom: -7px;
                    left: 50%;
                    margin-left: -6px;
                    border-width: 6px 6px 0;
                    border-style: solid;
                    border-color: #e2e8f0 transparent transparent transparent;
                    z-index: 0;
                }
                .marker-icon {
                    margin-top: 4px;
                    width: 20px;
                    height: 20px;
                    background: #f1f5f9;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                const map = new mapgl.Map('map', {
                    center: [76.889709, 43.238949],
                    zoom: 13,
                    key: '${dgisKey}',
                });

                const venues = ${JSON.stringify(venues)};

                venues.forEach((v, idx) => {
                    const el = document.createElement('div');
                    el.className = 'custom-marker';
                    const priceStr = v.average_price ? Math.round(v.average_price / 1000) + 'к' : '...';
                    el.innerHTML = \`\${priceStr} <div class="marker-icon">🍴</div>\`;
                    
                    el.onclick = () => {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: v.id || idx }));
                    };

                    const lng = parseFloat(v.longitude) || (76.8897 + (Math.random() - 0.5) * 0.05);
                    const lat = parseFloat(v.latitude) || (43.2389 + (Math.random() - 0.5) * 0.05);

                    new mapgl.HtmlMarker(map, {
                        coordinates: [lng, lat],
                        html: el,
                    });
                });
            </script>
        </body>
        </html>
    `;

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'markerPress' && onMarkerPress) {
                const venue = venues.find((v, idx) => (v.id || idx) === data.id);
                if (venue) onMarkerPress(venue);
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
        height: '100%',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    }
});

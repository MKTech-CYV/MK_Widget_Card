import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Scan } from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';

export default function ScanScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={[styles.centerContainer, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.permissionCard, { backgroundColor: colors.card }]}>
          <Scan color={colors.primary} size={64} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>Quyền Truy Cập Camera</Text>
          <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>Chúng tôi cần quyền truy cập camera để quét mã QR danh thiếp.</Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Cho phép truy cập</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    Alert.alert(
      "Đã nhận diện danh thiếp",
      data,
      [{ text: "Lưu danh bạ", onPress: () => {
        // Logic parse vCard và lưu danh bạ sẽ phát triển ở đây
        setScanned(false);
      }}, { text: "Hủy", onPress: () => setScanned(false), style: "cancel" }]
    );
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      
      {/* Scanner Overlay UI */}
      <View style={styles.overlay}>
        <View style={styles.topDim} />
        <View style={styles.middleRow}>
          <View style={styles.sideDim} />
          <View style={styles.cutout}>
            <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
          </View>
          <View style={styles.sideDim} />
        </View>
        <View style={styles.bottomDim}>
          <Text style={styles.scanHint}>Đưa mã QR vào khung để quét</Text>
        </View>
      </View>

      {scanned && (
        <TouchableOpacity style={[styles.rescanButton, { backgroundColor: colors.primary }]} onPress={() => setScanned(false)}>
          <Text style={styles.primaryButtonText}>Tiếp tục quét</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  permissionCard: { borderRadius: 24, padding: Spacing.xl, alignItems: 'center', width: '100%', shadowOpacity: 0.1 },
  permissionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: Spacing.md },
  permissionDesc: { textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 20 },
  primaryButton: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 30, width: '100%', alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 30 },
  middleRow: { flexDirection: 'row', height: 260 },
  sideDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  cutout: { width: 260, height: 260, backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: 25, height: 25, borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 15 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 15 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 15 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 15 },
  scanHint: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  rescanButton: { position: 'absolute', bottom: 50, alignSelf: 'center', padding: 16, borderRadius: 12, shadowOpacity: 0.3 }
});

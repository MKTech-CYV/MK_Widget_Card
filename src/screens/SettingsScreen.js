import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { ChevronRight, ShieldCheck, Moon, Bell, Info, Sun, Monitor } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Spacing } from '../constants/Theme';
import Footer from '../components/Footer';

export default function SettingsScreen({ navigation }) {
  const { colors, mode, setTheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Cài đặt</Text>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>CHẾ ĐỘ HIỂN THỊ</Text>
          <View style={styles.themeSelector}>
            <ThemeOption 
              active={mode === 'light'} 
              icon={<Sun size={20} color={mode === 'light' ? '#fff' : colors.primary} />} 
              label="Sáng" 
              onPress={() => setTheme('light')}
              colors={colors}
            />
            <ThemeOption 
              active={mode === 'dark'} 
              icon={<Moon size={20} color={mode === 'dark' ? '#fff' : colors.primary} />} 
              label="Tối" 
              onPress={() => setTheme('dark')}
              colors={colors}
            />
            <ThemeOption 
              active={mode === 'system'} 
              icon={<Monitor size={20} color={mode === 'system' ? '#fff' : colors.primary} />} 
              label="Hệ thống" 
              onPress={() => setTheme('system')}
              colors={colors}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ỨNG DỤNG</Text>
          <SettingItem 
            icon={<Bell size={22} color="#FF9500" />} 
            label="Thông báo" 
            onPress={() => {}}
            colors={colors}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PHÁP LÝ & HỖ TRỢ</Text>
          <SettingItem 
            icon={<ShieldCheck size={22} color={colors.success} />} 
            label="Điều khoản & Bảo mật" 
            onPress={() => navigation.navigate('Terms')}
            colors={colors}
          />
          <SettingItem 
            icon={<Info size={22} color={colors.textSecondary} />} 
            label="Phiên bản" 
            right={<Text style={[styles.versionText, { color: colors.textSecondary }]}>1.0.0 (Build 2026)</Text>}
            colors={colors}
          />
        </View>
        
        <Footer />
      </ScrollView>
    </View>
  );
}

const ThemeOption = ({ active, icon, label, onPress, colors }) => (
  <TouchableOpacity 
    style={[
      styles.themeOption, 
      { backgroundColor: colors.background },
      active && { backgroundColor: colors.primary }
    ]} 
    onPress={onPress}
  >
    {icon}
    <Text style={[
      styles.themeOptionLabel, 
      { color: colors.text },
      active && { color: '#fff' }
    ]}>{label}</Text>
  </TouchableOpacity>
);

export function TermsScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>Điều khoản</Text>
      <View style={[styles.termsCard, { backgroundColor: colors.card }]}>
        <ShieldCheck color={colors.success} size={40} style={{ alignSelf: 'center', marginBottom: 20 }} />
        <TermBlock title="1. Thu thập dữ liệu" content="Dữ liệu cá nhân của bạn được lưu trữ hoàn toàn cục bộ trên thiết bị và trong App Group để phục vụ tính năng Widget. Chúng tôi không thu thập thông tin cá nhân." colors={colors} />
        <TermBlock title="2. Sử dụng Camera" content="Camera chỉ được sử dụng để quét mã QR và trích xuất dữ liệu vCard. Không có hình ảnh nào được lưu trữ hay gửi đi." colors={colors} />
        <TermBlock title="3. Quyền hạn" content="Người dùng có toàn quyền xóa bỏ dữ liệu của mình bằng cách gỡ cài đặt ứng dụng hoặc xóa thông tin trong mục My Card." colors={colors} />
      </View>
      <Footer />
    </ScrollView>
  );
}

const TermBlock = ({ title, content, colors }) => (
  <View style={{ marginBottom: Spacing.lg }}>
    <Text style={[styles.termTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.termContent, { color: colors.textSecondary }]}>{content}</Text>
  </View>
);

const SettingItem = ({ icon, label, right, onPress, colors }) => (
  <TouchableOpacity 
    style={[styles.settingItem, { borderBottomColor: colors.background }]} 
    onPress={onPress} 
    disabled={!onPress}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.iconBox, { backgroundColor: colors.background }]}>{icon}</View>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
    </View>
    {right || (onPress && <ChevronRight color={colors.border} size={20} />)}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  screenTitle: { fontSize: 32, fontWeight: '800', marginBottom: Spacing.xl },
  section: { borderRadius: 24, marginBottom: Spacing.lg, overflow: 'hidden' },
  sectionHeader: { fontSize: 12, fontWeight: '700', marginLeft: Spacing.lg, marginBottom: Spacing.sm, marginTop: Spacing.md, textTransform: 'uppercase' },
  themeSelector: { flexDirection: 'row', padding: 10, justifyContent: 'space-between' },
  themeOption: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginHorizontal: 5, borderRadius: 14 },
  themeOptionLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 0.5 },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  settingLabel: { fontSize: 17, fontWeight: '500' },
  versionText: { fontSize: 15 },
  termsCard: { borderRadius: 24, padding: 25 },
  termTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  termContent: { fontSize: 15, lineHeight: 22 }
});

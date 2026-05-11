import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, X } from 'lucide-react-native';
import { useTheme, Spacing } from '../constants/Theme';
import { getTranslation } from '../constants/i18n';
import { useAppPreferences } from '../context/AppPreferencesContext';

export default function QuickTourModal({ visible, onFinish }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { language } = useAppPreferences();
  const steps = getTranslation(language, 'quickTour.steps');
  const title = getTranslation(language, 'quickTour.title');
  const skip = getTranslation(language, 'quickTour.skip');
  const next = getTranslation(language, 'quickTour.next');
  const done = getTranslation(language, 'quickTour.done');
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => { if (visible) setIndex(0); }, [visible]);

  const step = steps?.[index] || {};
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, paddingTop: insets.top + 24 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onFinish}><X color={colors.textSecondary} size={22} /></TouchableOpacity>
          </View>
          <Text style={[styles.stepTitle, { color: colors.primary }]}>{step.title}</Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.description}</Text>
          <View style={styles.footer}>
            <TouchableOpacity onPress={onFinish} style={styles.ghostButton}>
              <Text style={{ color: colors.textSecondary }}>{skip}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => index < steps.length - 1 ? setIndex(index + 1) : onFinish()}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.primaryText}>{index < steps.length - 1 ? next : done}</Text>
              {index < steps.length - 1 && <ChevronRight color="#fff" size={18} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: Spacing.lg },
  card: { borderRadius: 28, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', flex: 1, paddingRight: 12 },
  stepTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  stepDesc: { fontSize: 15, lineHeight: 22 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  ghostButton: { paddingVertical: 14, paddingHorizontal: 16 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18 },
  primaryText: { color: '#fff', fontWeight: '800', marginRight: 6 }
});

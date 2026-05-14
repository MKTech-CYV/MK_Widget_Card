import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const ProfileAvatar = ({ profile, colors, size = 64, style }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = profile?.avatarUrl;
  const showImage = Boolean(avatarUrl && !imageFailed);
  const radius = size / 2;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: `${colors.primary}18`,
          borderColor: `${colors.primary}22`,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { color: colors.primary, fontSize: Math.max(18, size * 0.36) }]}>
          {profile?.initials || 'MK'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '900',
    letterSpacing: 0,
  },
});

export default ProfileAvatar;

// app/(tabs)/index.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';

type Restriction = {
  id: string;
  label: string;
  iconUri: string;
};

type RestrictionOptionProps = {
  label: string;
  iconUri: string;
  isSelected: boolean;
  onPress: () => void;
};

const RestrictionOption: React.FC<RestrictionOptionProps> = ({
  label,
  iconUri,
  isSelected,
  onPress,
}) => {
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  }, [isSelected, scaleAnim]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        style={{
          width: 335,
          height: 70,
          backgroundColor: '#f7f8fa',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#eeeff3',
          borderStyle: 'solid',
          position: 'relative',
          marginTop: 15,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: 'Poppins',
            fontSize: 16,
            fontWeight: '400',
            lineHeight: 24,
            color: '#111111',
            textAlign: 'left',
          }}
          numberOfLines={1}
        >
          {label}
        </Text>

        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: '#01ac66',
            backgroundColor: 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#01ac66',
              transform: [{ scale: scaleAnim }],
            }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HealthReestrictions(): React.JSX.Element {
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [buttonScale] = useState(new Animated.Value(1));

  const restrictions: Restriction[] = useMemo(
    () => [
      {
        id: 'gluten',
        label: 'Gluten-Free',
        iconUri: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-10-03/PkzdAe3T1w.png',
      },
      {
        id: 'lactose',
        label: 'Lactose-Free',
        iconUri: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-10-03/BUL6K89PAh.png',
      },
      {
        id: 'soy',
        label: 'Soy-Free',
        iconUri: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-10-03/iRgHYODAZN.png',
      },
      {
        id: 'egg',
        label: 'Egg-Free',
        iconUri: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-10-03/BNB0ycfiPR.png',
      },
      {
        id: 'shellfish',
        label: 'Shellfish-Free',
        iconUri: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-10-03/2X7tZmd4xa.png',
      },
      {
        id: 'sugar',
        label: 'Low-Sugar',
        iconUri: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-10-03/KciRbjNycx.png',
      },
      {
        id: 'nut',
        label: 'Nut-Free',
        iconUri: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-10-03/2bccaPe25y.png',
      },
    ],
    []
  );

  const toggleRestriction = (id: string): void => {
    setSelectedRestrictions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleNextPress = (): void => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    console.log('Selected restrictions:', selectedRestrictions);
  };

  return (
      <ScrollView scrollEnabled contentInsetAdjustmentBehavior="automatic">
        <View
          style={{
            width: 375,
            minHeight: 881,
            backgroundColor: '#ffffff',
            borderRadius: 24,
            position: 'relative',
            overflow: 'hidden',
            marginTop: 0,
            marginRight: 'auto',
            marginBottom: 0,
            marginLeft: 'auto',
            paddingBottom: 20,
          }}
        >
          <View
            style={{
              width: 243,
              gap: 5,
              alignItems: 'center',
              position: 'relative',
              zIndex: 31,
              marginTop: 64,
              marginLeft: 66.5,
            }}
          >
            <Text
              style={{
                width: 243,
                height: 72,
                justifyContent: 'center',
                fontFamily: 'Poppins',
                fontSize: 24,
                fontWeight: '600',
                lineHeight: 36,
                color: '#111111',
                textAlign: 'center',
                overflow: 'hidden',
                zIndex: 32,
              }}
            >
              Medical or Health{'\n'}Related Restrictions
            </Text>
          </View>

          {/* Progress Indicators */}
          <View
            style={{
              width: 274,
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
              position: 'relative',
              zIndex: 37,
              marginTop: 30,
              marginLeft: 51,
            }}
          >
            {[0, 1, 2, 3, 4].map((index) => (
              <View
                key={index}
                style={{
                  width: 50,
                  height: 3,
                  backgroundColor: index === 0 ? '#fd8100' : '#f1f1f1',
                  borderRadius: 50,
                }}
              />
            ))}
          </View>

          {/* Helper Text */}
          <Text
            style={{
              fontFamily: 'Poppins',
              fontSize: 14,
              color: '#666666',
              textAlign: 'center',
              marginTop: 20,
              marginHorizontal: 40,
            }}
          >
            Select all that apply to you
          </Text>

          {/* Restriction Options */}
          <View style={{ marginHorizontal: 20 }}>
            {restrictions.map((restriction) => (
              <RestrictionOption
                key={restriction.id}
                label={restriction.label}
                iconUri={restriction.iconUri}
                isSelected={selectedRestrictions.includes(restriction.id)}
                onPress={() => toggleRestriction(restriction.id)}
              />
            ))}
          </View>

          {/* Next Button */}
          <TouchableOpacity onPress={handleNextPress} activeOpacity={0.9}>
            <Animated.View
              style={{
                width: 335,
                height: 57,
                backgroundColor: '#01ac66',
                borderRadius: 12,
                position: 'relative',
                marginTop: 25,
                marginLeft: 20,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ scale: buttonScale }],
              }}
            >
              <Text
                style={{
                  fontFamily: 'Poppins',
                  fontSize: 18,
                  fontWeight: '500',
                  color: '#ffffff',
                  textAlign: 'center',
                }}
              >
                Next{' '}
                {selectedRestrictions.length > 0 &&
                  `(${selectedRestrictions.length})`}
              </Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Status Bar */}
          <ImageBackground
            style={{
              height: '1.31%',
              position: 'absolute',
              top: '1.83%',
              left: 293.5,
              right: 14.5,
              zIndex: 36,
            }}
            source={{
              uri: 'https://codia-f2c.s3.us-west-1.amazonaws.com/image/2025-10-03/CX6TXvPm2Y.png',
            }}
            resizeMode="cover"
          />
        </View>
      </ScrollView>
  );
}
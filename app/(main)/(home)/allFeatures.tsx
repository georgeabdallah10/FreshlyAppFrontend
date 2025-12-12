import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  Easing,
  FadeInUp,
  FadeOut,
  Layout,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Feature = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  blurb: string;
  proTip: string;
};

const theme = {
  colors: {
    bg: "#FFFFFF",
    bgAlt: "#FAFAFA",
    card: "#FFFFFF",
    cardAlt: "#F7F9FC",
    primary: "#00A86B", // GREEN
    primaryDark: "#008F5C",
    accent: "#FD8100", // ORANGE
    primaryTint: "#E8F8F1",
    accentTint: "#FFF3E6",
    text: "#0A0A0A",
    textMut: "#5B6975",
    chipBg: "#F3F5F7",
    border: "#EAEAEA",
    shadow: "rgba(0,0,0,0.12)",
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
  },
  space: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 36,
  },
};

const features: Feature[] = [
  {
    id: "plan",
    icon: "leaf",
    title: "Personalized Meal Planning",
    blurb:
      "Weekly plans matched to your goals and dietary needs (gluten-free, vegan, etc.).",
    proTip: "Pro tip: Update goals monthly to keep plans fresh and aligned.",
  },
  {
    id: "recipes",
    icon: "restaurant",
    title: "Smart Recipe Suggestions",
    blurb:
      "Get meal ideas that use what's already in your pantry to cut waste.",
    proTip: "Pro tip: Scan barcodes when you restock for better suggestions.",
  },
  {
    id: "lists",
    icon: "list",
    title: "Automatic Grocery Lists",
    blurb: "One tap builds an aisle-sorted list you can share or check off.",
    proTip: "Pro tip: Long-press an item to swap brands or quantities.",
  },
  {
    id: "inventory",
    icon: "cube",
    title: "Smart Pantry Tracking",
    blurb:
      "Track inventory via scans, manual add, or smart-fridge integrations.",
    proTip: "Pro tip: Mark items as \"staples\" for quick add to future lists.",
  },
  {
    id: "alerts",
    icon: "notifications",
    title: "Expiration & Restock Alerts",
    blurb: "Use ingredients before they expire; never run out of essentials.",
    proTip: "Pro tip: Turn on weekly summaries to plan \"use-it-up\" meals.",
  },
  {
    id: "budget",
    icon: "cash",
    title: "Price Comparison & Budgeting",
    blurb: "See cheaper swaps, bulk options, and store comparisons.",
    proTip: "Pro tip: Enable Budget Mode for 5-ingredient, under-$ recipes.",
  },
  {
    id: "delivery",
    icon: "bicycle",
    title: "Integrated Grocery Delivery",
    blurb: "Order or schedule pickup from your favorite retailers.",
    proTip: "Pro tip: Batch orders on one delivery window to save fees.",
  },
  {
    id: "eco",
    icon: "earth",
    title: "Eco & Waste Reduction Tools",
    blurb: "Track your savings and choose seasonal, low-waste options.",
    proTip: "Pro tip: Toggle Eco Mode for local and seasonal suggestions.",
  },
  {
    id: "family",
    icon: "people",
    title: "Family & Shared Mode",
    blurb: "Share plans and lists so the whole house is in sync.",
    proTip: "Pro tip: Assign items to household members for faster trips.",
  },
  {
    id: "subs",
    icon: "repeat",
    title: "Subscription Essentials",
    blurb: "Auto-reorder staples like milk, eggs, and bread on your cadence.",
    proTip: "Pro tip: Set backup brands for smoother substitutions.",
  },
];

const steps = [
  "Set preferences (goals, allergies, diet).",
  "Scan/add what's in your pantry.",
  "Get your weekly plan with recipes & portions.",
  "Shop smarter (auto list + price compare).",
  "Cook & track progress and waste savings.",
];

const tips = [
  "Turn on Eco Mode",
  "Sync your calendar",
  "Enable Budget Mode",
  "Use Family Sharing",
  "Check Progress Stats",
];

const KPI = [
  { icon: "time", label: "Time Saved", value: "~3–5 hrs/wk" },
  { icon: "trash", label: "Less Waste", value: "Up to 30%" },
  { icon: "pricetag", label: "Budget-Friendly", value: "Save more" },
] as const;

const Hero = () => {
  const router = useRouter();
  return (
    <LinearGradient
      colors={[theme.colors.primaryTint, theme.colors.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Animated.View
        entering={FadeInUp.duration(600).easing(Easing.out(Easing.cubic))}
        style={styles.heroHeader}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerButton]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </Animated.View>
      
      <Animated.View 
        entering={FadeInUp.delay(100).duration(600).easing(Easing.out(Easing.cubic))}
        style={styles.titleContainer}
      >
        <Text style={styles.h1}>
          SAVR <Text style={styles.h1Accent}>Features</Text>
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(600)}>
        <Text style={styles.subtitle}>
          Your AI-powered meal planning and grocery assistant. SAVR learns your
          tastes, plans your week, builds a smart shopping list, and helps you
          cook with what you already have—saving time, money, and food waste.
        </Text>
      </Animated.View>
      
      <Animated.View 
        entering={FadeInUp.delay(300).duration(600)}
        style={styles.kpiContainer}
      >
        {KPI.map((k, index) => (
          <Animated.View
            key={k.label}
            entering={FadeInUp.delay(350 + index * 50).duration(500)}
            style={styles.kpiChip}
          >
            <View style={styles.kpiIconWrap}>
              <Ionicons name={k.icon} size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={styles.kpiValue}>{k.value}</Text>
            </View>
          </Animated.View>
        ))}
      </Animated.View>
    </LinearGradient>
  );
};

const FeatureCard = ({ item, index }: { item: Feature; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View
      layout={Layout.duration(180).easing(Easing.out(Easing.cubic))}
      entering={FadeInUp.delay(index * 60).duration(500)}
      style={[
        styles.card,
        {
          borderLeftWidth: 4,
          borderLeftColor:
            index % 2 ? theme.colors.accent : theme.colors.primary,
        },
      ]}
    >
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${
          expanded ? "Collapse" : "Expand"
        } for details.`}
        android_ripple={{ color: "rgba(0,168,107,0.08)" }}
        style={styles.cardInner}
      >
        <View style={styles.cardHeader}>
          <View style={[
            styles.iconWrap,
            { backgroundColor: index % 2 ? theme.colors.accentTint : theme.colors.primaryTint }
          ]}>
            <Ionicons 
              name={item.icon} 
              size={22} 
              color={index % 2 ? theme.colors.accent : theme.colors.primary} 
            />
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.colors.textMut}
          />
        </View>

        <Text style={styles.cardBlurb}>{item.blurb}</Text>

        {expanded && (
          <Animated.View
            layout={Layout.duration(160).easing(Easing.out(Easing.cubic))}
            entering={FadeInUp.duration(140)}
            exiting={FadeOut.duration(120)}
            style={styles.proTipBox}
          >
            <View style={styles.proTipBar} />
            <View style={styles.proTipContent}>
              <Ionicons name="sparkles" size={16} color={theme.colors.accent} />
              <Text style={styles.proTipText}>{item.proTip}</Text>
            </View>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const StepItem = ({ text, index }: { text: string; index: number }) => {
  return (
    <Animated.View 
      layout={Layout.springify()} 
      entering={FadeInUp.delay(index * 80).duration(500)}
      style={styles.stepItem}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.stepBadge}
      >
        <Text style={styles.stepBadgeText}>{index + 1}</Text>
      </LinearGradient>
      <Text style={styles.stepText}>{text}</Text>
    </Animated.View>
  );
};

const TipPill = ({ text, index }: { text: string; index: number }) => {
  return (
    <Animated.View 
      entering={FadeInUp.delay(index * 60).duration(400)}
      style={styles.tipPill}
    >
      <Ionicons name="bulb" size={15} color={theme.colors.accent} />
      <Text style={styles.tipText}>{text}</Text>
    </Animated.View>
  );
};

const CTAButton = ({ onPress }: { onPress: () => void }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <Animated.View entering={FadeInUp.delay(100).duration(600)}>
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel="Start planning"
        style={[styles.ctaWrap, pressed && { transform: [{ scale: 0.97 }] }]}
      >
        <LinearGradient
          colors={[theme.colors.accent, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaBtn}
        >
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          <Text style={styles.ctaText}>Start Planning</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

export default function SavrFeaturesScreen() {
  const featureList = useMemo(() => features, []);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        <Hero />

        {/* Core Features */}
        <View style={styles.section}>
          <Text style={styles.h2}>Core Features</Text>
          <Text style={styles.sectionBlurb}>
            Explore the building blocks of a calmer kitchen—each card expands
            with a quick pro tip.
          </Text>

          <View style={styles.cardGrid}>
            {featureList.map((f, i) => (
              <FeatureCard key={f.id} item={f} index={i} />
            ))}
          </View>
        </View>

        {/* How to Use */}
        <View style={styles.section}>
          <Text style={styles.h2}>How to Use SAVR</Text>
          <Text style={styles.sectionBlurb}>
            Get set up in SAVR handles the planning so you can focus on
            living.
          </Text>
          <View style={styles.stepsWrap}>
            {steps.map((s, i) => (
              <StepItem key={i} text={s} index={i} />
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.h2}>Tips to Get the Most Out of It</Text>
          <View style={styles.tipsRow}>
            {tips.map((t, i) => (
              <TipPill key={t} text={t} index={i} />
            ))}
          </View>
        </View>

        {/* Closing + CTA */}
        <View style={[styles.section, styles.closing]}>
          <Text style={styles.h2}>Why People Love SAVR</Text>
          <Text style={styles.sectionBlurb}>
            A simpler way to plan, shop, and eat—personal to you, powered by AI.
            Less stress, less waste, more time back every week.
          </Text>
          {/*
          <CTAButton
            onPress={() => {
              // Example: open a marketing page or navigate to onboarding
              Linking.openURL("https://example.com/savr"); // replace with your deep link or route
            }}
          />*/}
        </View>

        <View style={{ height: theme.space.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  container: {
    paddingBottom: theme.space.xxl,
  },
  hero: {
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.space.lg,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryTint,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,168,107,0.3)",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: theme.space.md,
  },
  h1: {
    fontSize: 34,
    fontWeight: "800",
    color: theme.colors.text,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  h1Accent: {
    color: theme.colors.primary,
  },
  subtitle: {
    marginTop: theme.space.md,
    fontSize: 15.5,
    lineHeight: 23,
    color: theme.colors.textMut,
    textAlign: "center",
  },
  kpiContainer: {
    marginTop: theme.space.xl,
    gap: theme.space.md,
  },
  kpiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    backgroundColor: theme.colors.card,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryTint,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  kpiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiContent: {
    flex: 1,
  },
  kpiLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  kpiValue: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },

  section: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xxl,
  },
  h2: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.space.sm,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  sectionBlurb: {
    fontSize: 14.5,
    lineHeight: 22,
    color: theme.colors.textMut,
    marginBottom: theme.space.xl,
    textAlign: "center",
  },

  cardGrid: {
    gap: theme.space.md,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: "hidden",
  },
  cardInner: {
    padding: theme.space.lg,
    gap: theme.space.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,168,107,0.25)",
  },
  cardTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cardBlurb: {
    color: theme.colors.textMut,
    fontSize: 14.5,
    lineHeight: 21,
  },
  proTipBox: {
    marginTop: theme.space.sm,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentTint,
    borderWidth: 1,
    borderColor: "rgba(253,129,0,0.3)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.space.sm,
  },
  proTipBar: {
    width: 3,
    height: "100%",
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  proTipContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  proTipText: {
    color: theme.colors.text,
    fontSize: 13.5,
    flex: 1,
    lineHeight: 19,
  },

  stepsWrap: {
    gap: theme.space.md,
  },
  stepItem: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  stepText: {
    color: theme.colors.text,
    fontSize: 14.5,
    flex: 1,
    lineHeight: 21,
    fontWeight: "500",
  },

  tipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
    justifyContent: "center",
  },
  tipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tipText: {
    color: theme.colors.text,
    fontSize: 13.5,
    fontWeight: "600",
  },

  closing: {
    paddingBottom: theme.space.xl,
  },
  ctaWrap: {
    marginTop: theme.space.xl,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: theme.space.xl,
    justifyContent: "center",
    borderRadius: theme.radius.xl,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});

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
      "Get meal ideas that use what’s already in your pantry to cut waste.",
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
    proTip: "Pro tip: Mark items as “staples” for quick add to future lists.",
  },
  {
    id: "alerts",
    icon: "notifications",
    title: "Expiration & Restock Alerts",
    blurb: "Use ingredients before they expire; never run out of essentials.",
    proTip: "Pro tip: Turn on weekly summaries to plan “use-it-up” meals.",
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
  "Scan/add what’s in your pantry.",
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
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.headerButton]}
        >
          <Text style={styles.headerIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>
          Freshly <Text style={{ color: theme.colors.primary }}>Features</Text>
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(90).duration(600)}>
        <Text style={styles.subtitle}>
          Your AI-powered meal planning and grocery assistant. Freshly learns
          your tastes, plans your week, builds a smart shopping list, and helps
          you cook with what you already have—saving time, money, and food
          waste.
        </Text>
      </Animated.View>
      <View style={styles.kpiRow}>
        {KPI.map((k) => (
          <View key={k.label} style={styles.kpiChip}>
            <Ionicons name={k.icon} size={16} color={theme.colors.primary} />
            <Text style={styles.kpiLabel}>{k.label}</Text>
            <Text style={styles.kpiValue}>{k.value}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
};

const FeatureCard = ({ item, index }: { item: Feature; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View
      layout={Layout.duration(180).easing(Easing.out(Easing.cubic))}
      style={[
        styles.card,
        {
          borderLeftWidth: 3,
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
        android_ripple={{ color: "rgba(0,0,0,0.04)" }}
        style={styles.cardInner}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.colors.primary}
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
            <Ionicons name="sparkles" size={16} color={theme.colors.accent} />
            <Text style={styles.proTipText}>{item.proTip}</Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const StepItem = ({ text, index }: { text: string; index: number }) => {
  return (
    <Animated.View layout={Layout.springify()} style={styles.stepItem}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{index + 1}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </Animated.View>
  );
};

const TipPill = ({ text }: { text: string }) => {
  return (
    <View style={styles.tipPill}>
      <Ionicons name="bulb" size={14} color={theme.colors.text} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
};

const CTAButton = ({ onPress }: { onPress: () => void }) => {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel="Start planning"
      style={[styles.ctaWrap, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <LinearGradient
        colors={[theme.colors.accent, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.ctaBtn}
      >
        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        <Text style={styles.ctaText}>Start planning</Text>
      </LinearGradient>
    </Pressable>
  );
};

export default function FreshlyFeaturesScreen() {
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
          <Text style={styles.h2}>Core features</Text>
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
          <Text style={styles.h2}>How to use Freshly</Text>
          <Text style={styles.sectionBlurb}>
            Get set up in minutes—Freshly handles the planning so you can focus
            on living.
          </Text>
          <View style={styles.stepsWrap}>
            {steps.map((s, i) => (
              <StepItem key={i} text={s} index={i} />
            ))}
          </View>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.h2}>Tips to get the most out of it</Text>
          <View style={styles.tipsRow}>
            {tips.map((t) => (
              <TipPill key={t} text={t} />
            ))}
          </View>
        </View>

        {/* Closing + CTA */}
        <View style={[styles.section, styles.closing]}>
          <Text style={styles.h2}>Why people love Freshly</Text>
          <Text style={styles.sectionBlurb}>
            A simpler way to plan, shop, and eat—personal to you, powered by AI.
            Less stress, less waste, more time back every week.
          </Text>
          <CTAButton
            onPress={() => {
              // Example: open a marketing page or navigate to onboarding
              Linking.openURL("https://example.com/freshly"); // replace with your deep link or route
            }}
          />
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
    paddingTop: 40,
  },
  container: {
    paddingBottom: theme.space.xxl,
  },
  hero: {
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.space.lg,
    paddingBottom: theme.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  h1: {
    flexDirection: "row",
    alignContent: "center",
    justifyContent: "center",
    gap: 20,
    width: 300,
    fontSize: 30,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: theme.space.md,
    fontSize: 15.5,
    lineHeight: 22,
    color: theme.colors.textMut,
  },
  kpiRow: {
    flexDirection: "row",
    gap: theme.space.sm,
    marginTop: theme.space.lg,
    flexWrap: "wrap",
  },
  kpiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primaryTint,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,168,107,0.25)",
  },
  kpiLabel: {
    color: theme.colors.text,
    fontSize: 12.5,
  },
  kpiValue: {
    color: theme.colors.primary,
    fontSize: 12,
  },

  section: {
    paddingHorizontal: theme.space.lg,
    paddingTop: theme.space.xl,
  },
  h2: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.space.sm,
    letterSpacing: 0.2,
  },
  sectionBlurb: {
    fontSize: 14.5,
    lineHeight: 21,
    color: theme.colors.textMut,
    marginBottom: theme.space.lg,
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
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: "hidden",
  },
  cardInner: {
    padding: theme.space.lg,
    gap: theme.space.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primaryTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,168,107,0.22)",
  },
  cardTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16.5,
    fontWeight: "600",
  },
  cardBlurb: {
    color: theme.colors.textMut,
    fontSize: 14,
    lineHeight: 20,
  },
  proTipBox: {
    marginTop: theme.space.sm,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentTint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(253,129,0,0.25)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: theme.space.md,
  },

  proTipBar: {
    width: 3,
    height: "100%",
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
    marginRight: 10,
  },
  proTipText: {
    color: theme.colors.text,
    fontSize: 13.5,
    flex: 1,
  },

  stepsWrap: {
    gap: theme.space.sm,
  },
  stepItem: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.cardAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  stepBadgeText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  stepText: {
    color: theme.colors.text,
    fontSize: 14.5,
    flex: 1,
    lineHeight: 20,
  },

  tipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
  },
  tipPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.chipBg,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  tipText: {
    color: theme.colors.text,
    fontSize: 13.5,
  },

  closing: {
    paddingBottom: theme.space.xl,
  },
  ctaWrap: {
    marginTop: theme.space.lg,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    justifyContent: "center",
    borderRadius: theme.radius.xl,
    // backgroundColor: "#00A86B",
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryTint,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,168,107,0.25)",
    marginBottom: 10,
    marginLeft:-8,
  },
  headerIcon: { fontSize: 20, color: theme.colors.primary },
});

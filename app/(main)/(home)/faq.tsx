import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FAQItem = {
  question: string;
  answer: string;
};

type FAQCategory = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  items: FAQItem[];
};

const FAQ_DATA: FAQCategory[] = [
  {
    title: "Basics of SAVR",
    icon: "information-circle",
    color: "#00A86B",
    items: [
      {
        question: "What is this app, and how does it work?",
        answer:
          "This app is an AI-powered smart grocery shopping assistant that helps users plan meals, create grocery lists, track pantry inventory, compare prices, and reduce food waste—all in one convenient platform.",
      },
      {
        question: "Is the app free to use?",
        answer:
          "The app offers a free version with essential features. A premium subscription unlocks advanced features like smart inventory management, personalized meal planning, and price comparisons.",
      },
      {
        question: "How does the AI personalize my experience?",
        answer:
          "The AI considers your dietary preferences, past grocery purchases, pantry inventory, budget, and food preferences to create tailored meal plans and shopping lists.",
      },
    ],
  },
  {
    title: "Meal Planning & Recipes",
    icon: "restaurant",
    color: "#FD8100",
    items: [
      {
        question:
          "Can the app create meal plans based on my dietary restrictions?",
        answer:
          "Yes! You can input dietary restrictions (e.g., vegan, gluten-free, keto), allergies, and health goals, and the app will generate meal plans accordingly.",
      },
      {
        question:
          "What if I don't know what to cook with my current pantry items?",
        answer:
          "The app suggests recipes based on what you already have, helping you reduce waste and save money.",
      },
      {
        question: "Can I save my favorite recipes?",
        answer:
          "Absolutely! You can bookmark recipes, customize them, and even share them with friends or family.",
      },
    ],
  },
  {
    title: "Grocery Lists & Shopping",
    icon: "cart",
    color: "#2196F3",
    items: [
      {
        question: "How does the automatic grocery list feature work?",
        answer:
          "The app generates a grocery list based on your selected meal plan and current pantry inventory, ensuring you buy only what you need.",
      },
      {
        question: "Can I manually add or remove items from my grocery list?",
        answer:
          "Yes, you can fully customize your grocery list by adding, removing, or reordering items.",
      },
      {
        question:
          "Does the app categorize items for a more organized shopping trip?",
        answer:
          "Yes, grocery lists are automatically sorted into categories like produce, dairy, pantry, and frozen foods to streamline shopping.",
      },
    ],
  },
  {
    title: "Inventory & Waste Reduction",
    icon: "leaf",
    color: "#4CAF50",
    items: [
      {
        question: "How does the smart inventory management work?",
        answer:
          "You can update your pantry manually, use barcode scanning, or integrate with a smart fridge (if supported) to track inventory in real time.",
      },
      {
        question: "Will the app remind me when food is about to expire?",
        answer:
          "Yes, you'll receive notifications when items are nearing their expiration date, along with recipe suggestions to use them up.",
      },
      {
        question: "Does the app help reduce food waste?",
        answer:
          "Yes! It suggests recipes using ingredients before they expire, tracks what you use most, and provides food storage tips.",
      },
    ],
  },
  {
    title: "Budgeting & Price Comparison",
    icon: "cash",
    color: "#FF9800",
    items: [
      {
        question: "How does the app help me save money?",
        answer:
          "The app compares prices across multiple grocery stores, suggests cheaper alternatives, and helps prevent unnecessary purchases.",
      },
      {
        question: "Can I set a grocery budget?",
        answer:
          "Yes, you can set a spending limit, and the app will recommend cost-effective options while keeping you within budget.",
      },
      {
        question: "Does the app offer coupons or discounts?",
        answer:
          "The app integrates with participating stores to show available discounts, promotions, and digital coupons.",
      },
    ],
  },
  {
    title: "Grocery Delivery & Pickup",
    icon: "bicycle",
    color: "#9C27B0",
    items: [
      {
        question: "Can I order groceries directly through the app?",
        answer:
          "Yes! The app integrates with grocery delivery services, allowing you to place orders for pickup or delivery.",
      },
      {
        question: "Can I schedule recurring grocery deliveries?",
        answer:
          "Yes, you can set up automatic deliveries for regularly purchased items like milk, eggs, and bread.",
      },
      {
        question: "Does the app work with my favorite grocery store?",
        answer:
          "The app partners with major grocery retailers and delivery services. Availability depends on your location.",
      },
    ],
  },
  {
    title: "Social & Family Features",
    icon: "people",
    color: "#E91E63",
    items: [
      {
        question: "Can I share my grocery list with family members?",
        answer:
          "Yes! You can sync your grocery list with family members or roommates so everyone stays updated.",
      },
      {
        question: "Can I see what my friends are cooking?",
        answer:
          "Yes, you can connect with friends, share recipes, and get meal inspiration from your network.",
      },
    ],
  },
  {
    title: "Sustainability & Health",
    icon: "fitness",
    color: "#00BCD4",
    items: [
      {
        question: "Does the app promote sustainable grocery shopping?",
        answer:
          "Yes! It suggests eco-friendly options, tracks your carbon footprint, and rewards sustainable shopping choices.",
      },
      {
        question: "How does the app help with healthy eating?",
        answer:
          "The app offers nutrition breakdowns for recipes and ingredients, helping you make healthier choices.",
      },
    ],
  },
];

const FAQScreen = () => {
  const router = useRouter();
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleCategory = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === index ? null : index);
    setExpandedItem(null); // Close all items when category changes
  };

  const toggleItem = (categoryIndex: number, itemIndex: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const itemKey = `${categoryIndex}-${itemIndex}`;
    setExpandedItem(expandedItem === itemKey ? null : itemKey);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.title}>Frequently Asked Questions</Text>
          <Text style={styles.subtitle}>
            Find answers to common questions about SAVR
          </Text>
        </View>

        {FAQ_DATA.map((category, categoryIndex) => (
          <CategoryComponent
            key={categoryIndex}
            category={category}
            categoryIndex={categoryIndex}
            isExpanded={expandedCategory === categoryIndex}
            expandedItem={expandedItem}
            onToggleCategory={() => toggleCategory(categoryIndex)}
            onToggleItem={(itemIndex) => toggleItem(categoryIndex, itemIndex)}
          />
        ))}

        <View style={styles.contactSection}>
          <Ionicons name="chatbubble-ellipses" size={32} color="#00A86B" />
          <Text style={styles.contactTitle}>Still have questions?</Text>
          <Text style={styles.contactText}>
            We're here to help! Reach out to our support team.
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            activeOpacity={0.8}
            onPress={() => console.log("Email sent")}
          >
            <Ionicons name="mail" size={18} color="#FFF" />
            <Text style={styles.contactButtonText}>support@joinsavr.com</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const CategoryComponent: React.FC<{
  category: FAQCategory;
  categoryIndex: number;
  isExpanded: boolean;
  expandedItem: string | null;
  onToggleCategory: () => void;
  onToggleItem: (itemIndex: number) => void;
}> = ({
  category,
  categoryIndex,
  isExpanded,
  expandedItem,
  onToggleCategory,
  onToggleItem,
}) => {
  return (
    <View style={styles.categoryContainer}>
      <TouchableOpacity
        style={[
          styles.categoryHeader,
          { borderLeftColor: category.color },
          isExpanded && styles.categoryHeaderExpanded,
        ]}
        onPress={onToggleCategory}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: `${category.color}15` },
          ]}
        >
          <Ionicons name={category.icon} size={22} color={category.color} />
        </View>
        <View style={styles.categoryTitleContainer}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={22}
          color="#999"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.categoryItems}>
          {category.items.map((item, itemIndex) => {
            const itemKey = `${categoryIndex}-${itemIndex}`;
            const isItemExpanded = expandedItem === itemKey;
            return (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.faqItem,
                  isItemExpanded && styles.faqItemExpanded,
                ]}
                onPress={() => onToggleItem(itemIndex)}
                activeOpacity={0.7}
              >
                <View style={styles.questionRow}>
                  <View style={styles.questionNumber}>
                    <Text style={styles.questionNumberText}>
                      {itemIndex + 1}
                    </Text>
                  </View>
                  <Text style={styles.question}>{item.question}</Text>
                  <Ionicons
                    name={isItemExpanded ? "remove-circle" : "add-circle"}
                    size={20}
                    color={category.color}
                  />
                </View>
                {isItemExpanded && (
                  <View style={styles.answerContainer}>
                    <View
                      style={[
                        styles.answerLine,
                        { backgroundColor: category.color },
                      ]}
                    />
                    <Text style={styles.answer}>{item.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  categoryContainer: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderLeftWidth: 4,
  },
  categoryHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  categoryItems: {
    paddingBottom: 8,
  },
  faqItem: {
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7EBEF",
  },
  faqItemExpanded: {
    backgroundColor: "#FFFFFF",
    borderColor: "#00A86B20",
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  questionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#00A86B10",
    justifyContent: "center",
    alignItems: "center",
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00A86B",
  },
  question: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    flex: 1,
    lineHeight: 20,
  },
  answerContainer: {
    marginTop: 12,
    paddingTop: 12,
    flexDirection: "row",
    gap: 12,
  },
  answerLine: {
    width: 3,
    borderRadius: 2,
    marginLeft: 10,
  },
  answer: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  contactSection: {
    marginTop: 16,
    padding: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginTop: 12,
    marginBottom: 6,
  },
  contactText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#00A86B",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#00A86B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
});

export default FAQScreen;

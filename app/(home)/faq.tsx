import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type FAQItem = {
  question: string;
  answer: string;
};

const FAQ_DATA: FAQItem[] = [
  {
    question: 'How does Freshly help me manage my pantry?',
    answer: 'Freshly helps you track all items in your pantry, set expiration dates, and get notifications when items are about to expire. You can scan groceries, receipts, or manually add items.',
  },
  {
    question: 'Can I create meal plans based on my pantry items?',
    answer: 'Yes! Freshly AI analyzes your pantry items and creates personalized meal plans using what you already have, minimizing waste and saving money.',
  },
  {
    question: 'How do I scan groceries?',
    answer: 'Navigate to the Pantry screen and tap the camera icon. You can scan individual items, entire grocery bags, or receipts. Our AI will automatically identify and add items to your pantry.',
  },
  {
    question: 'What dietary preferences does Freshly support?',
    answer: 'Freshly supports various dietary preferences including vegetarian, vegan, pescatarian, keto, paleo, gluten-free, dairy-free, and more. You can set these in your preferences.',
  },
  {
    question: 'How does the AI chat assistant work?',
    answer: 'The Freshly AI assistant can answer questions about recipes, suggest meals based on your pantry, provide cooking tips, and help you plan your shopping list.',
  },
  {
    question: 'Can I share my pantry with family members?',
    answer: 'Yes! You can create a family group and share your pantry inventory with family members. Everyone can see what\'s available and add items.',
  },
  {
    question: 'How accurate is the expiration date tracking?',
    answer: 'Freshly uses industry-standard shelf life data and allows you to manually adjust dates. You\'ll receive notifications 3 days before items expire.',
  },
  {
    question: 'Can I customize recipe serving sizes?',
    answer: 'Absolutely! When generating recipes, you can specify the number of servings, and Freshly will automatically adjust ingredient quantities.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we take security seriously. All your data is encrypted and stored securely. We never share your personal information with third parties.',
  },
  {
    question: 'How do I update my dietary preferences?',
    answer: 'Go to Profile → Preferences and update your dietary restrictions, allergies, goals, and cooking preferences anytime.',
  },
];

const FAQScreen = () => {
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
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
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Find answers to common questions about Freshly
        </Text>

        {FAQ_DATA.map((item, index) => (
          <FAQItemComponent
            key={index}
            item={item}
            index={index}
            isExpanded={expandedIndex === index}
            onToggle={() => toggleExpand(index)}
          />
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still have questions?</Text>
          <Text style={styles.contactText}>
            Contact us at support@freshly.app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const FAQItemComponent: React.FC<{
  item: FAQItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, isExpanded, onToggle }) => {
  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.questionRow}>
        <Text style={styles.question}>{item.question}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#00A86B"
        />
      </View>
      {isExpanded && (
        <Text style={styles.answer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  faqItem: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EBEF',
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  answer: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  contactSection: {
    marginTop: 32,
    padding: 20,
    backgroundColor: '#E8F8F2',
    borderRadius: 16,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#00A86B',
    fontWeight: '600',
  },
});

export default FAQScreen;

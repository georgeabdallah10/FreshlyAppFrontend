// Enhanced Pantry Item Card with auto-generated images
import { usePantryImage } from '@/hooks/usePantryImages';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type PantryItemData = {
  id: number | string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  category?: string;
  expires_at?: string | null;
  image_url?: string | null;
};

type PantryItemCardProps = {
  item: PantryItemData;
  onEdit?: (item: PantryItemData) => void;
  onDelete?: (item: PantryItemData) => void;
  onRefreshImage?: (item: PantryItemData) => void;
};

const PantryItemCard: React.FC<PantryItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onRefreshImage,
}) => {
  const { imageUrl, loading: imageLoading, error: imageError, refresh } = usePantryImage(
    item.id,
    item.ingredient_name
  );

  const handleRefreshImage = () => {
    refresh();
    onRefreshImage?.(item);
  };

  // Get category icon
  const getCategoryIcon = (category?: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('fruit')) return 'nutrition';
    if (cat.includes('vegetable') || cat.includes('produce')) return 'leaf';
    if (cat.includes('dairy')) return 'water';
    if (cat.includes('meat') || cat.includes('seafood')) return 'fish';
    if (cat.includes('grain') || cat.includes('pasta') || cat.includes('bakery')) return 'pizza';
    if (cat.includes('snack') || cat.includes('sweet')) return 'ice-cream';
    if (cat.includes('beverage')) return 'cafe';
    return 'restaurant';
  };

  // Check if item is expiring soon
  const isExpiringSoon = () => {
    if (!item.expires_at) return false;
    const expiryDate = new Date(item.expires_at);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
  };

  const isExpired = () => {
    if (!item.expires_at) return false;
    return new Date(item.expires_at) < new Date();
  };

  return (
    <View style={[
      styles.card,
      isExpired() && styles.cardExpired,
      isExpiringSoon() && styles.cardExpiringSoon,
    ]}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {imageLoading ? (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="small" color="#00A86B" />
            <Text style={styles.imagePlaceholderText}>Loading...</Text>
          </View>
        ) : imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons
              name={getCategoryIcon(item.category)}
              size={32}
              color="#00A86B"
            />
          </View>
        )}
        
        {/* Refresh button overlay (shows on error or no image) */}
        {(imageError || (!imageLoading && !imageUrl)) && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshImage}
          >
            <Ionicons name="refresh" size={16} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.ingredient_name}
          </Text>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>

        <View style={styles.quantityRow}>
          <Text style={styles.quantityText}>
            {item.quantity} {item.unit}
          </Text>
          
          {item.expires_at && (
            <View style={[
              styles.expiryBadge,
              isExpired() && styles.expiryBadgeExpired,
              isExpiringSoon() && styles.expiryBadgeWarning,
            ]}>
              <Ionicons
                name={isExpired() ? 'alert-circle' : 'time'}
                size={12}
                color={isExpired() ? '#FF3B30' : isExpiringSoon() ? '#FFA500' : '#666'}
              />
              <Text style={[
                styles.expiryText,
                isExpired() && styles.expiryTextExpired,
                isExpiringSoon() && styles.expiryTextWarning,
              ]}>
                {isExpired() ? 'Expired' : new Date(item.expires_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.actionsContainer}>
        {onEdit && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(item)}
          >
            <Ionicons name="pencil" size={20} color="#666" />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(item)}
          >
            <Ionicons name="trash" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cardExpired: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  cardExpiringSoon: {
    borderColor: '#FFA500',
    backgroundColor: '#FFFAF0',
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 168, 107, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    color: '#00A86B',
    fontWeight: '500',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiryBadgeExpired: {
    backgroundColor: '#FFE5E5',
  },
  expiryBadgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  expiryText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  expiryTextExpired: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  expiryTextWarning: {
    color: '#FFA500',
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
});

export default PantryItemCard;

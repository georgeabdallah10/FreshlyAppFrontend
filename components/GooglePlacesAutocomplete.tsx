
import { ParsedAddress, useGooglePlaces } from '@/hooks/useGooglePlaces';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

interface GooglePlacesAutocompleteProps {
  onSelectAddress: (address: ParsedAddress) => void;
  placeholder?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  autoFocus?: boolean;
  initialValue?: string;
}

/**
 * Google Places Autocomplete Component
 * 
 * Cost-optimized autocomplete with:
 * - 400ms debounce
 * - Session tokens
 * - Local caching
 * - Minimal API fields
 * - Address-only results
 * - US-only restriction
 */
export const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  onSelectAddress,
  placeholder = 'Enter your address',
  containerStyle,
  inputStyle,
  autoFocus = false,
  initialValue = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [showResults, setShowResults] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const {
    predictions,
    isLoading,
    error,
    searchPlaces,
    getPlaceDetails,
    clearPredictions,
  } = useGooglePlaces();

  const handleInputChange = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (text.trim().length > 0) {
      setShowResults(true);
      searchPlaces(text);
    } else {
      setShowResults(false);
      clearPredictions();
    }
  }, [searchPlaces, clearPredictions]);

  const handleSelectPrediction = useCallback(async (placeId: string, description: string) => {
    setIsSelecting(true);
    setShowResults(false);
    
    // Immediately update input with selected text for better UX
    setSearchQuery(description);

    try {
      const addressDetails = await getPlaceDetails(placeId);
      
      if (addressDetails) {
        onSelectAddress(addressDetails);
      } else {
        // Fallback: if details fetch fails, at least show the description
        console.warn('Failed to get place details, using description');
      }
    } catch (err) {
      console.error('Error selecting place:', err);
    } finally {
      setIsSelecting(false);
      clearPredictions();
    }
  }, [getPlaceDetails, onSelectAddress, clearPredictions]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setShowResults(false);
    clearPredictions();
  }, [clearPredictions]);

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
        <TextInput
          style={[styles.searchInput, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#888888"
          value={searchQuery}
          onChangeText={handleInputChange}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="words"
          editable={!isSelecting}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={handleClearSearch} 
            activeOpacity={0.6}
            disabled={isSelecting}
          >
            <View style={styles.clearButton}>
              <Text style={styles.clearIcon}>✕</Text>
            </View>
          </TouchableOpacity>
        )}
        {(isLoading || isSelecting) && (
          <ActivityIndicator 
            size="small" 
            color="#00C853" 
            style={styles.loader}
          />
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Autocomplete Results */}
      {showResults && predictions.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>SUGGESTIONS</Text>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectPrediction(item.place_id, item.description)}
                activeOpacity={0.6}
              >
                <View style={styles.resultIconContainer}>
                  <Text style={styles.resultIcon}>📍</Text>
                </View>
                <View style={styles.resultTextContainer}>
                  <Text style={styles.resultName}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.resultAddress}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={styles.resultsList}
          />
        </View>
      )}

      {/* No Results Message */}
      {showResults && !isLoading && predictions.length === 0 && searchQuery.length >= 3 && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No addresses found</Text>
        </View>
      )}

      {/* API Key Warning */}
      {error?.includes('API key') && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>⚙️ Setup Required</Text>
          <Text style={styles.warningText}>
            To use address autocomplete, add your Google Places API key to app.json:
          </Text>
          <Text style={styles.warningCode}>
            {`{\n  "expo": {\n    "extra": {\n      "googlePlacesApiKey": "YOUR_KEY"\n    }\n  }\n}`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchIconText: {
    fontSize: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111111',
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loader: {
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#FFE8E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
  },
  resultsContainer: {
    maxHeight: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  resultsHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0B0B0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    letterSpacing: 1,
    backgroundColor: '#FAFAFA',
  },
  resultsList: {
    maxHeight: 250,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultIcon: {
    fontSize: 18,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 14,
    color: '#888888',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  warningContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 8,
  },
  warningCode: {
    fontSize: 12,
    color: '#6D4C41',
    fontFamily: 'monospace',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 4,
  },
});

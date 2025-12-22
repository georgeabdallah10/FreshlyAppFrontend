import { BOTTOM_NAV_TOTAL, SCROLL_BOTTOM_PADDING } from "@/constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ViewStyle } from "react-native";

/**
 * Returns the bottom inset needed to position elements (FABs, buttons, inputs)
 * ABOVE the floating bottom navbar.
 *
 * Use this for:
 * - FAB positioning: style={{ bottom: bottomNavInset + 16 }}
 * - Fixed buttons at bottom of screen
 * - Input fields that must not be covered
 *
 * @param extra - Additional spacing beyond the navbar clearance
 */
export const useBottomNavInset = (extra: number = 0) => {
  const insets = useSafeAreaInsets();
  return BOTTOM_NAV_TOTAL + insets.bottom + extra;
};

/**
 * Returns a contentContainerStyle for ScrollView/FlatList/SectionList
 * that adds bottom padding so the last items scroll above the navbar.
 *
 * The navbar floats over content - this padding ensures users can
 * scroll to see all content without it being permanently hidden.
 *
 * Usage:
 * const scrollContentStyle = useScrollContentStyle();
 * <ScrollView contentContainerStyle={scrollContentStyle} />
 * <FlatList contentContainerStyle={scrollContentStyle} />
 *
 * @param extraPadding - Additional padding if needed
 */
export const useScrollContentStyle = (extraPadding: number = 0): ViewStyle => {
  const insets = useSafeAreaInsets();
  return {
    paddingBottom: BOTTOM_NAV_TOTAL + insets.bottom + SCROLL_BOTTOM_PADDING + extraPadding,
  };
};

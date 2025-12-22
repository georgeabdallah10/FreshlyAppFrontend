import React, { forwardRef } from "react";
import {
  TextInput as RNTextInput,
  type TextInputProps,
} from "react-native";

type AppTextInputProps = TextInputProps;

const AppTextInput = forwardRef<RNTextInput, AppTextInputProps>(function AppTextInput(
  props,
  ref
) {
  const {
    autoCorrect,
    spellCheck,
    autoCapitalize,
    keyboardType,
    textContentType,
    secureTextEntry,
    ...rest
  } = props;

  if (secureTextEntry) {
    return (
      <RNTextInput
        ref={ref}
        secureTextEntry={secureTextEntry}
        autoCorrect={autoCorrect}
        spellCheck={spellCheck}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        textContentType={textContentType}
        {...rest}
      />
    );
  }

  return (
    <RNTextInput
      ref={ref}
      autoCorrect={autoCorrect ?? true}
      spellCheck={spellCheck ?? true}
      autoCapitalize={autoCapitalize ?? "sentences"}
      keyboardType={keyboardType ?? "default"}
      textContentType={textContentType ?? "none"}
      {...rest}
    />
  );
});

export default AppTextInput;

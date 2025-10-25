// api/user/uploadViaBackend.ts
import * as ImageManipulator from "expo-image-manipulator";
import { Storage } from "../utils/storage";
import { BASE_URL } from "../env/baseUrl";
import { Platform } from "react-native";

export async function uploadAvatarViaProxy({
  uri,
  appUserId,
}: {
  uri: string | File;
  appUserId: string;
}) {
  const token = await Storage.getItem("access_token");

  const data = new FormData();

  if (typeof uri === "string") {
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
      data.append("file", file);
    } else {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      // @ts-ignore
      data.append("file", { uri: manipulated.uri, name: "profile.jpg", type: "image/jpeg" });
    }
  } else {
    data.append("file", uri); // File object from web
  }

  const res = await fetch(`${BASE_URL}/storage/avatar/proxy`, {
    method: "POST",
    headers: {
      "x-user-id": appUserId,                      // <- REQUIRED for your backend
      Authorization: `Bearer ${token}`,
    },
    body: data,                                    // don't set content-type manually
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ bucket: string; path: string; publicUrl: string }>;
}
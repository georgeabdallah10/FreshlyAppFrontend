// api/user/uploadViaBackend.ts
import * as ImageManipulator from "expo-image-manipulator";
import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../env/baseUrl";

export async function uploadAvatarViaProxy({
  uri,
  appUserId,       // <-- pass your app's user id here
}: {
  uri: string;
  appUserId: string;
}) {
  // normalize to JPEG for consistency
  const manipulated = await ImageManipulator.manipulateAsync(
    uri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  );
    const token = await SecureStore.getItemAsync("access_token");


  const data = new FormData();
  // @ts-ignore: RN FormData shape
  data.append("file", { uri: manipulated.uri, name: "profile.jpg", type: "image/jpeg" });

  const res = await fetch(`${BASE_URL}/storage/avatar/proxy`, {
    method: "POST",
    headers: {
      "x-user-id": appUserId,                      // <- REQUIRED for your backend
      Authorization: `Bearer ${token}` ,
    },
    body: data,                                    // don't set content-type manually
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ bucket: string; path: string; publicUrl: string }>;
}
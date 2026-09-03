/**
 * Intro carousel — FIRST-TIME ONLY (AsyncStorage `hasSeenIntro` flag).
 * 3 slides: find work fast · trust score · money tracking. Horizontal paging
 * FlatList, page dots, Skip top-right, Next / Get Started primary button.
 * Never shown again once completed (or skipped).
 */
import React, { useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions, NativeSyntheticEvent,
  NativeScrollEvent, ViewToken,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/ui/Icon";
import { TrustRing } from "@/components/ui/TrustRing";
import { Button } from "@/components/ui/Button";
import { C, T, R, S } from "@/theme/tokens";

export const HAS_SEEN_INTRO = "shramsetu.hasSeenIntro";

const { width: PAGE_W } = Dimensions.get("window");

const SLIDES = [
  {
    key: "work",
    title: "Kaam dhundo,\ndin bhar me",
    caption: "Verified contractors ke jobs — AI aapke skill aur experience ke hisaab se best match nikalta hai.",
  },
  {
    key: "trust",
    title: "Trust score —\naapki asli pehchaan",
    caption: "Har verified job, skill quiz aur review se score badhta hai. Achha kaam = zyada kaam.",
  },
  {
    key: "money",
    title: "Paisa ka hisaab,\nseedha haath",
    caption: "Income, kharcha aur savings ek jagah — AI Sahayak ke saath roz ka plan.",
  },
] as const;

export default function Intro() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) setIdx(viewableItems[0].index);
    },
    []
  );

  async function finish() {
    await AsyncStorage.setItem(HAS_SEEN_INTRO, "1");
    router.replace("/");
  }

  function next() {
    if (idx >= SLIDES.length - 1) { finish(); return; }
    listRef.current?.scrollToOffset({ offset: (idx + 1) * PAGE_W, animated: true });
  }

  return (
    <SafeAreaView style={st.safe} edges={["top", "bottom"]}>
      {/* Skip */}
      {idx < SLIDES.length - 1 ? (
        <Pressable onPress={finish} hitSlop={10} style={st.skip}>
          <Text style={st.skipText}>Skip</Text>
        </Pressable>
      ) : (
        <View style={st.skip} />
      )}

      <FlatList
        ref={listRef}
        data={[...SLIDES]}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item, index }) => (
          <View style={[st.slide, { width: PAGE_W }]}>
            <SlideArt which={item.key} />
            <Text style={st.title}>{item.title}</Text>
            <Text style={st.caption}>{item.caption}</Text>
            {index === SLIDES.length - 1 ? null : <View style={{ height: 54 }} />}
          </View>
        )}
      />

      {/* Footer: dots + button */}
      <View style={st.footer}>
        <View style={st.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[st.dot, i === idx && st.dotActive, i < idx && st.dotDone]} />
          ))}
        </View>
        <Button
          label={idx === SLIDES.length - 1 ? "Get Started" : "Next"}
          onPress={next}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

type Slide = { key: string; title: string; caption: string };

/** Tonal icon compositions per slide — no images needed. */
function SlideArt({ which }: { which: string }) {
  if (which === "trust") {
    return (
      <View style={st.artWrap}>
        <TrustRing score={82} size={168} />
      </View>
    );
  }
  if (which === "money") {
    return (
      <View style={[st.artWrap, { gap: S.md }]}>
        <View style={st.walletCard}>
          <View style={st.walletTop}>
            <View style={[st.walletChip, { backgroundColor: C.primarySoft }]}>
              <Icon name="wallet" size={20} color={C.primary} />
            </View>
            <Text style={st.walletLabel}>Today</Text>
          </View>
          <Text style={st.walletValue}>₹940</Text>
          <View style={st.walletRow}>
            <View style={[st.walletChip, { backgroundColor: C.greenSoft }]}>
              <Icon name="arrow-up" size={14} color={C.green} />
            </View>
            <Text style={st.walletSub}>Income logged</Text>
          </View>
        </View>
      </View>
    );
  }
  // work
  return (
    <View style={st.artWrap}>
      <View style={st.stackCard}>
        <View style={st.stackRow}>
          <View style={[st.stackChip, { backgroundColor: C.primarySoft }]}>
            <Icon name="briefcase" size={18} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.stackTitle}>Site Mason — Lucknow</Text>
            <Text style={st.stackSub}>₹800/day · 2.4 km away</Text>
          </View>
          <View style={st.matchPill}>
            <Text style={st.matchText}>92%</Text>
          </View>
        </View>
        <View style={[st.stackRow, { marginTop: S.md }]}>
          <View style={[st.stackChip, { backgroundColor: C.blueSoft }]}>
            <Icon name="construct" size={18} color={C.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.stackTitle}>Carpenter — Kanpur</Text>
            <Text style={st.stackSub}>₹750/day · Full day</Text>
          </View>
          <View style={[st.matchPill, { backgroundColor: C.blueSoft }]}>
            <Text style={[st.matchText, { color: C.blue }]}>87%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  skip: { alignSelf: "flex-end", paddingVertical: S.sm, paddingHorizontal: S.lg },
  skipText: { color: C.text2, fontSize: T.body, fontWeight: "600" },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: S.xxl,
    gap: S.lg,
  },
  artWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S.xl,
  },
  title: {
    fontSize: T.display,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    lineHeight: 38,
  },
  caption: {
    fontSize: T.body,
    color: C.text2,
    textAlign: "center",
    lineHeight: 23,
    fontWeight: "500",
  },
  footer: { paddingHorizontal: S.xl, paddingBottom: S.md, paddingTop: S.md, gap: S.lg },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.muted },
  dotActive: { backgroundColor: C.primary, width: 22 },
  dotDone: { backgroundColor: C.primarySoft },
  // slide 1 art
  stackCard: {
    width: "100%",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    gap: S.xs,
  },
  stackRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  stackChip: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stackTitle: { color: C.text, fontSize: T.body, fontWeight: "700" },
  stackSub: { color: C.text2, fontSize: T.caption, marginTop: 1 },
  matchPill: { backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  matchText: { color: C.primary, fontSize: T.caption, fontWeight: "800" },
  // slide 3 art
  walletCard: {
    width: "100%",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.xl,
    gap: S.sm,
  },
  walletTop: { flexDirection: "row", alignItems: "center", gap: S.md },
  walletChip: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  walletLabel: { color: C.text2, fontSize: T.caption, fontWeight: "700", textTransform: "uppercase" as const, letterSpacing: 0.4 },
  walletValue: { fontSize: 44, fontWeight: "800", color: C.text },
  walletRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.xs },
  walletSub: { color: C.green, fontSize: T.caption, fontWeight: "600" },
});

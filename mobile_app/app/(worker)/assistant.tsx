/**
 * AI Assistant (V3) — chat with orange user bubbles / white bot bubbles,
 * intent captions, suggestion chips, typing dots, CTA buttons.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { timeAgo } from "@/utils";
import { toAppRoute } from "@/utils/routes";
import { C, T, R, S } from "@/theme/tokens";

const SUGGESTED_PROMPTS = [
  "Find jobs near me",
  "What should I earn?",
  "Why is my trust score 87?",
  "Where is my pending payment?",
  "How can I save more?",
  "Which skill should I learn?",
];

export default function WorkerAssistant() {
  const router = useRouter();
  const user = useStore((s) => s.currentUser);
  const profile = useStore((s) => s.workerProfiles.find((p) => p.userId === s.currentUser?.id));
  const chatHistory = useStore((s) => s.chatHistory);
  const sendAssistantMessage = useStore((s) => s.sendAssistantMessage);
  const clearChat = useStore((s) => s.clearChat);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Keep the latest message visible as it arrives.
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [chatHistory.length, thinking]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || thinking) return;
    setInput("");
    setThinking(true);
    try {
      await sendAssistantMessage(msg);
    } finally {
      setThinking(false);
    }
  }

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={st.header}>
          <View style={st.botBadge}>
            <Icon name="sparkles" size={19} color={C.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle}>AI Assistant</Text>
            <Text style={st.headerSub}>Jobs · wages · money · career</Text>
          </View>
          <Pressable onPress={() => clearChat(user?.id ?? "")} hitSlop={10}>
            <Text style={st.clearText}>Clear</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={st.chat}>
          {chatHistory.length === 0 && (
            <View style={st.welcome}>
              <View style={st.welcomeIcon}>
                <Icon name="sparkles" size={26} color={C.purple} />
              </View>
              <Text style={st.welcomeTitle}>
                Hi {profile?.profession && profile.profession !== "Helper" ? `${profile.profession} ` : ""}{user?.name?.split(" ")[0]}
              </Text>
              <Text style={st.welcomeSub}>
                I'm here to help with jobs, wages, payments, and career growth. Try a suggestion below.
              </Text>
            </View>
          )}

          {chatHistory.map((msg) => (
            <View key={msg.id} style={[st.msgRow, msg.role === "user" ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
              <View style={[st.msgCol, msg.role === "user" ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
                <View style={st.msgMeta}>
                  {msg.role === "assistant" ? (
                    <>
                      {msg.intent && (
                        <View style={st.intentChip}>
                          <Text style={st.intent}>{msg.intent.replace("_", " ")}</Text>
                        </View>
                      )}
                      <Text style={st.time}>{timeAgo(msg.createdAt)}</Text>
                    </>
                  ) : (
                    <Text style={st.time}>{timeAgo(msg.createdAt)}</Text>
                  )}
                </View>
                <View style={[st.bubble, msg.role === "user" ? st.bubbleUser : st.bubbleBot]}>
                  <Text style={msg.role === "user" ? st.bubbleUserText : st.bubbleBotText}>
                    {msg.content}
                  </Text>
                </View>
                {msg.cta && (
                  <Button
                    label={msg.cta.label}
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push(toAppRoute(msg.cta!.link) as never)}
                  />
                )}
              </View>
            </View>
          ))}

          {thinking && (
            <View style={[st.msgRow, { justifyContent: "flex-start" }]}>
              <View style={st.bubbleBot}>
                <View style={st.dots}>
                  <View style={[st.dot, { opacity: 0.4 }]} />
                  <View style={[st.dot, { opacity: 0.7 }]} />
                  <View style={[st.dot, { opacity: 1 }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions + input */}
        <View style={st.inputZone}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.promptRow}>
            {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
              <Pressable key={p} onPress={() => send(p)} style={st.promptChip}>
                <Text style={st.promptText}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={st.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              placeholder="Ask anything about jobs, money, skills…"
              placeholderTextColor={C.text3}
              style={st.input}
              multiline
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim() || thinking}
              style={[st.sendBtn, (!input.trim() || thinking) && { opacity: 0.4 }]}
            >
              <Icon name="arrow-up" size={20} color={C.onPrimary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.hairline,
  },
  botBadge: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.purpleSoft, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: T.body + 1, fontWeight: "800", color: C.text },
  headerSub: { fontSize: T.tiny, color: C.text3, marginTop: 1 },
  clearText: { color: C.text3, fontSize: T.caption, fontWeight: "700" },
  chat: { padding: S.lg, gap: S.md, paddingBottom: S.xl },
  welcome: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  welcomeIcon: {
    width: 56, height: 56, borderRadius: 20,
    backgroundColor: C.purpleSoft, alignItems: "center", justifyContent: "center",
    marginBottom: S.xs,
  },
  welcomeTitle: { fontSize: T.body + 2, fontWeight: "800", color: C.text },
  welcomeSub: { fontSize: T.caption + 1, color: C.text2, textAlign: "center", lineHeight: 21, paddingHorizontal: S.xl },
  msgRow: { flexDirection: "row" },
  msgCol: { maxWidth: "85%", gap: 4 },
  msgMeta: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.xs },
  intentChip: {
    backgroundColor: C.purpleSoft,
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  intent: { fontSize: 9.5, color: C.purple, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  time: { fontSize: 10, color: C.text3 },
  bubble: { borderRadius: R.lg, paddingHorizontal: S.lg, paddingVertical: S.md },
  bubbleUser: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: C.surface, borderBottomLeftRadius: 4 },
  bubbleUserText: { color: C.onPrimary, fontSize: T.caption + 1, lineHeight: 21 },
  bubbleBotText: { color: C.text, fontSize: T.caption + 1, lineHeight: 21 },
  dots: { flexDirection: "row", gap: 5, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.purple },
  inputZone: { backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: S.sm, paddingBottom: S.md },
  promptRow: { gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.xs },
  promptChip: {
    backgroundColor: C.muted,
    borderRadius: R.pill, paddingHorizontal: S.md + 2, paddingVertical: 7,
  },
  promptText: { fontSize: T.caption, color: C.text2, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.sm },
  input: {
    flex: 1,
    backgroundColor: C.muted,
    borderRadius: R.lg,
    paddingHorizontal: S.md, paddingVertical: S.sm + 2,
    fontSize: T.caption + 1, color: C.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
});

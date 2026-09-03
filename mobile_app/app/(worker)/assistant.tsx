/**
 * AI Assistant — Gemini-powered chat over the same /api/assistant endpoint,
 * with quick prompts, intent labels, typing dots, CTA buttons.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { timeAgo } from "@/utils";
import { C, T, R, S } from "@/theme/tokens";

const SUGGESTED_PROMPTS = [
  "Find jobs near me",
  "What should I earn?",
  "Why is my trust score 87?",
  "Where is my pending payment?",
  "How can I save more?",
  "Which skill should I learn?",
];

const INTENT_EMOJI: Record<string, string> = {
  JOB_SEARCH: "💼", WAGE_ESTIMATE: "💰", TRUST_CHECK: "🛡️", PAYMENT_STATUS: "💰",
  SAVINGS_ADVICE: "💰", CAREER_GUIDANCE: "🎓", PROFILE_HELP: "👤",
  SAFETY_REPORT: "⚠️", GENERAL_HELP: "✨",
};

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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.botBadge}><Text>✨</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>Jobs · wages · money · career</Text>
          </View>
          <Pressable onPress={() => clearChat(user?.id ?? "")} hitSlop={10}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chat}>
          {chatHistory.length === 0 && (
            <View style={styles.welcome}>
              <View style={styles.welcomeIcon}><Text style={{ fontSize: 26 }}>✨</Text></View>
              <Text style={styles.welcomeTitle}>
                Hi {profile?.profession && profile.profession !== "Helper" ? `${profile.profession} ` : ""}{user?.name?.split(" ")[0]} 👋
              </Text>
              <Text style={styles.welcomeSub}>
                I'm here to help with jobs, wages, payments, and career growth. Try a suggestion below.
              </Text>
            </View>
          )}

          {chatHistory.map((msg) => (
            <View key={msg.id} style={[styles.msgRow, msg.role === "user" ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }]}>
              <View style={[styles.msgCol, msg.role === "user" ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
                <View style={styles.msgMeta}>
                  {msg.role === "assistant" ? (
                    <>
                      {msg.intent && (
                        <Text style={styles.intent}>
                          {INTENT_EMOJI[msg.intent] ?? "✨"} {msg.intent.replace("_", " ")}
                        </Text>
                      )}
                      <Text style={styles.time}>{timeAgo(msg.createdAt)}</Text>
                    </>
                  ) : (
                    <Text style={styles.time}>{timeAgo(msg.createdAt)}</Text>
                  )}
                </View>
                <View style={[styles.bubble, msg.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
                  <Text style={msg.role === "user" ? styles.bubbleUserText : styles.bubbleBotText}>
                    {msg.content}
                  </Text>
                </View>
                {msg.cta && (
                  <Button
                    label={msg.cta.label}
                    variant="secondary"
                    size="sm"
                    onPress={() => router.push(msg.cta!.link as never)}
                  />
                )}
              </View>
            </View>
          ))}

          {thinking && (
            <View style={[styles.msgRow, { justifyContent: "flex-start" }]}>
              <View style={styles.bubbleBot}>
                <View style={styles.dots}>
                  <View style={[styles.dot, { opacity: 0.4 }]} />
                  <View style={[styles.dot, { opacity: 0.7 }]} />
                  <View style={[styles.dot, { opacity: 1 }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions + input */}
        <View style={styles.inputZone}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRow}>
            {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
              <Pressable key={p} onPress={() => send(p)} style={styles.promptChip}>
                <Text style={styles.promptText}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              placeholder="Ask anything about jobs, money, skills…"
              placeholderTextColor={C.gray500}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim() || thinking}
              style={[styles.sendBtn, (!input.trim() || thinking) && { opacity: 0.45 }]}
            >
              <Text style={styles.sendText}>➤</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream50 },
  header: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray200,
  },
  botBadge: {
    width: 38, height: 38, borderRadius: R.md,
    backgroundColor: C.purple600, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: T.md, fontWeight: "900", color: C.navy900 },
  headerSub: { fontSize: T.xs, color: C.gray500, marginTop: 1 },
  clearText: { color: C.gray500, fontSize: T.xs, fontWeight: "700" },
  chat: { padding: S.lg, gap: S.md, paddingBottom: S.xl },
  welcome: { alignItems: "center", paddingVertical: S.xxl, gap: S.sm },
  welcomeIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.purple100, alignItems: "center", justifyContent: "center",
    marginBottom: S.xs,
  },
  welcomeTitle: { fontSize: T.lg, fontWeight: "800", color: C.navy900 },
  welcomeSub: { fontSize: T.sm, color: C.gray600, textAlign: "center", lineHeight: 20, paddingHorizontal: S.xl },
  msgRow: { flexDirection: "row" },
  msgCol: { maxWidth: "85%", gap: 4 },
  msgMeta: { flexDirection: "row", alignItems: "center", gap: S.sm, paddingHorizontal: S.xs },
  intent: { fontSize: 10, color: C.purple600, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  time: { fontSize: 10, color: C.gray500 },
  bubble: { borderRadius: R.lg, paddingHorizontal: S.lg, paddingVertical: S.md },
  bubbleUser: { backgroundColor: C.orange600, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, borderBottomLeftRadius: 4 },
  bubbleUserText: { color: C.white, fontSize: T.sm, lineHeight: 20 },
  bubbleBotText: { color: C.navy900, fontSize: T.sm, lineHeight: 20 },
  dots: { flexDirection: "row", gap: 5, paddingVertical: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.purple600 },
  inputZone: { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.gray200, paddingTop: S.sm, paddingBottom: S.md },
  promptRow: { gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.xs },
  promptChip: {
    backgroundColor: C.cream100,
    borderWidth: 1, borderColor: C.gray200,
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 6,
  },
  promptText: { fontSize: T.xs, color: C.gray700, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: S.sm, paddingHorizontal: S.lg, paddingTop: S.sm },
  input: {
    flex: 1,
    backgroundColor: C.cream50,
    borderWidth: 1, borderColor: C.gray300,
    borderRadius: R.lg,
    paddingHorizontal: S.md, paddingVertical: S.sm,
    fontSize: T.sm, color: C.navy900,
    maxHeight: 100,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.orange600, alignItems: "center", justifyContent: "center",
  },
  sendText: { color: C.white, fontSize: 18 },
});

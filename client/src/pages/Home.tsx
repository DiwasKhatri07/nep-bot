import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Activity, ArrowUpRight, Bot, Check, ChevronRight, Command, Copy, Globe2, KeyRound, Link2, Loader2, LockKeyhole, MessageCircleMore, MoreHorizontal, Phone, Play, Plus, Radio, RefreshCw, Settings2, ShieldAlert, ShieldCheck, Sparkles, TerminalSquare, Zap, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const countries = [
  { iso: "NP", name: "Nepal", dial: "977", flag: "🇳🇵", placeholder: "98 4123 4567" },
  { iso: "IN", name: "India", dial: "91", flag: "🇮🇳", placeholder: "98765 43210" },
  { iso: "PK", name: "Pakistan", dial: "92", flag: "🇵🇰", placeholder: "300 1234567" },
  { iso: "BD", name: "Bangladesh", dial: "880", flag: "🇧🇩", placeholder: "1712 345678" },
  { iso: "AE", name: "United Arab Emirates", dial: "971", flag: "🇦🇪", placeholder: "50 123 4567" },
  { iso: "SA", name: "Saudi Arabia", dial: "966", flag: "🇸🇦", placeholder: "50 123 4567" },
  { iso: "GB", name: "United Kingdom", dial: "44", flag: "🇬🇧", placeholder: "7700 900123" },
  { iso: "US", name: "United States", dial: "1", flag: "🇺🇸", placeholder: "(415) 555-0123" },
] as const;

const previewCommands = [
  ["/hi", "Essentials", "Greeting and quick start"], ["/roast [name]", "Essentials", "Lighthearted roast"], ["/menu", "Essentials", "Command directory"], ["/joke", "Fun", "Short joke"], ["/meme", "Fun", "Moderated meme"], ["/translate", "Utilities", "Text translation"], ["/media", "Utilities", "Approved media helper"], ["/ai", "AI", "Provider-backed query"], ["/public", "Owner", "Public command mode"], ["/antilink", "Moderation", "Group link controls"],
] as const;

const safetyCards: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: ShieldCheck, title: "Credentials stay server-side", text: "The dashboard accepts no access tokens or session exports." },
  { icon: LockKeyhole, title: "Pairing remains user-confirmed", text: "A generated code does not link a device until you approve it in WhatsApp." },
  { icon: ShieldAlert, title: "No unsolicited bulk messaging", text: "NEP BOT intentionally excludes mass-send workflows." },
  { icon: Globe2, title: "Country-normalized onboarding", text: "The server confirms number formatting before connector requests." },
];

function formatNational(value: string, iso: string) {
  const digits = value.replace(/\D/g, "").slice(0, 15);
  if (iso === "US") return digits.replace(/(\d{0,3})(\d{0,3})(\d{0,4})/, (_, a, b, c) => [a && `(${a}`, a.length === 3 && ")", b, c].filter(Boolean).join(a.length === 3 && b ? " " : "")).trim();
  const groupSize = iso === "NP" ? [2, 4, 4] : [3, 3, 4, 5];
  const chunks: string[] = [];
  let cursor = 0;
  for (const size of groupSize) { if (digits.slice(cursor, cursor + size)) chunks.push(digits.slice(cursor, cursor + size)); cursor += size; }
  return chunks.join(" ");
}

function formatTime(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusMeta(status?: string) {
  if (status === "connected") return { label: "Connected", dot: "bg-emerald-400", className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" };
  if (status === "pairing") return { label: "Pairing in progress", dot: "bg-amber-300", className: "border-amber-300/20 bg-amber-300/10 text-amber-200" };
  if (status === "error") return { label: "Needs attention", dot: "bg-rose-400", className: "border-rose-400/20 bg-rose-400/10 text-rose-200" };
  if (status === "ready_to_pair") return { label: "Ready to pair", dot: "bg-sky-300", className: "border-sky-300/20 bg-sky-300/10 text-sky-200" };
  return { label: "Not connected", dot: "bg-muted-foreground", className: "border-border bg-muted/40 text-muted-foreground" };
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const profilesQuery = trpc.bot.list.useQuery(undefined, { enabled: isAuthenticated });
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const selectedProfile = useMemo(() => profilesQuery.data?.find((profile) => profile.id === selectedProfileId) ?? profilesQuery.data?.[0], [profilesQuery.data, selectedProfileId]);
  const profileDetailQuery = trpc.bot.profile.useQuery({ profileId: selectedProfile?.id ?? 0 }, { enabled: isAuthenticated && Boolean(selectedProfile?.id) });
  const activityQuery = trpc.bot.activity.useQuery(selectedProfile ? { profileId: selectedProfile.id } : undefined, { enabled: isAuthenticated });
  const catalogQuery = trpc.bot.catalog.useQuery(undefined, { enabled: isAuthenticated });
  const [botName, setBotName] = useState("");
  const [countryIso, setCountryIso] = useState<(typeof countries)[number]["iso"]>("NP");
  const [nationalNumber, setNationalNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("Write a friendly welcome message for a new NEP BOT chat.");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const country = countries.find((item) => item.iso === countryIso) ?? countries[0];
  const digits = nationalNumber.replace(/\D/g, "");
  const e164Preview = digits ? `+${country.dial}${digits}` : `+${country.dial}`;

  const createProfile = trpc.bot.create.useMutation({
    onSuccess: async (profile) => {
      toast.success("Profile created and number validated.");
      setSelectedProfileId(profile.id);
      setBotName("");
      setNationalNumber("");
      await utils.bot.list.invalidate();
      await utils.bot.activity.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const requestPairing = trpc.bot.requestPairing.useMutation({
    onSuccess: async (result) => {
      setPairingCode(result.pairingCode);
      toast.success("Temporary pairing code generated. It is not stored.");
      await utils.bot.list.invalidate();
      await utils.bot.activity.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const syncStatus = trpc.bot.syncStatus.useMutation({ onSuccess: async (result) => { if (!result.configured) toast.message("Add the connector URL and token before checking a live session."); else toast.success(`Connector reports: ${result.connectionStatus.replace(/_/g, " ")}`); await utils.bot.list.invalidate(); await utils.bot.profile.invalidate(); await utils.bot.activity.invalidate(); }, onError: (error) => toast.error(error.message) });
  const disconnect = trpc.bot.disconnect.useMutation({ onSuccess: async () => { setPairingCode(null); toast.success("Connector session disconnected."); await utils.bot.list.invalidate(); await utils.bot.activity.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateMode = trpc.bot.updateMode.useMutation({ onSuccess: async () => { await utils.bot.profile.invalidate(); await utils.bot.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const updateFeatures = trpc.bot.updateFeatures.useMutation({ onSuccess: async () => { await utils.bot.profile.invalidate(); await utils.bot.activity.invalidate(); toast.success("Owner controls updated."); }, onError: (error) => toast.error(error.message) });
  const aiPreview = trpc.bot.aiPreview.useMutation({ onSuccess: (result) => setAiResponse(result.response), onError: (error) => toast.error(error.message) });

  const guardOwner = () => {
    if (isAuthenticated) return true;
    toast.message("Sign in as the owner to save or change bot settings.");
    return false;
  };
  const handleCreate = () => {
    if (!guardOwner()) return startLogin();
    createProfile.mutate({ botName, countryIso: country.iso, countryDialCode: `+${country.dial}`, nationalNumber: digits });
  };
  const handleFeature = (field: "antiLink" | "antiCall" | "autoRead" | "autoReact" | "groupControls" | "aiAutoReply", checked: boolean) => {
    if (!guardOwner() || !selectedProfile) return;
    if (field === "aiAutoReply" && checked) toast.message("AI auto-reply will activate only after a provider key is configured.");
    updateFeatures.mutate({ profileId: selectedProfile.id, settings: { [field]: checked } });
  };
  const profileStatus = statusMeta(selectedProfile?.connectionStatus);
  const featureState = profileDetailQuery.data?.features;
  const activity = activityQuery.data ?? [];
  const catalog = catalogQuery.data ?? previewCommands.map(([command, group, description]) => ({ command, group, description, access: group === "Owner" || group === "Moderation" ? "Owner" : "Public" }));

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-10">
      <section id="overview" className="grid-noise panel-sheen relative overflow-hidden rounded-[28px] border border-border/80 bg-card/65 px-5 py-7 shadow-[0_22px_70px_oklch(0.04_0.03_155_/_32%)] md:px-8 md:py-9">
        <div className="absolute right-0 top-0 size-72 -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl enter-up">
            <div className="mb-5 flex flex-wrap items-center gap-2"><Badge className="border-primary/25 bg-primary/10 px-2.5 py-1 text-primary hover:bg-primary/10"><ShieldCheck className="mr-1.5 size-3.5" />Owner-controlled workspace</Badge><span className="mono text-[11px] uppercase tracking-[.15em] text-muted-foreground">WhatsApp onboarding · operations · guardrails</span></div>
            <h1 className="font-display text-4xl font-bold tracking-[-.045em] text-foreground sm:text-5xl">Manage the bot.<br /><span className="text-primary">Keep the control.</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">NEP BOT guides you from country-aware phone setup to linked-device pairing, then keeps profiles, feature switches, and safe connection activity in one clear owner workspace.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={cn("flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium", profileStatus.className)}><span className={cn("pulse-dot size-2 rounded-full", profileStatus.dot)} />{profileStatus.label}</div>
            <Button onClick={() => document.getElementById("pair-device")?.scrollIntoView({ behavior: "smooth" })} className="h-11 rounded-xl px-5 font-semibold shadow-[0_10px_28px_oklch(0.72_0.16_151_/_20%)]"><Plus className="mr-1.5 size-4" />Set up a bot</Button>
          </div>
        </div>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
          {[{ icon: Link2, label: "Connection", value: selectedProfile ? profileStatus.label : "No active profile", hint: "Pairing remains user-confirmed" }, { icon: ShieldCheck, label: "Safety posture", value: "Owner controlled", hint: "No bulk messaging workflows" }, { icon: Command, label: "Command catalog", value: `${catalog.length}+ ready`, hint: "Public and owner scopes" }].map((stat) => <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/35 p-4 backdrop-blur-sm"><div className="mb-5 flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary"><stat.icon className="size-4" /></div><p className="text-xs text-muted-foreground">{stat.label}</p><p className="mt-1 font-display text-lg font-semibold">{stat.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{stat.hint}</p></div>)}
        </div>
      </section>

      <section id="pair-device" className="scroll-mt-6 grid gap-5 xl:grid-cols-[1.04fr_.96fr]">
        <Card className="panel-sheen border-border/70 bg-card/80 shadow-xl shadow-black/10"><CardContent className="p-5 md:p-7"><div className="mb-7 flex items-start justify-between gap-4"><div><p className="mono text-[11px] uppercase tracking-[.15em] text-primary">Guided onboarding</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Create a bot profile</h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">We validate the selected country and national number on the server before a pairing request can be sent.</p></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary"><Phone className="size-5" /></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 sm:col-span-2"><span className="text-xs font-medium text-foreground">Bot profile name</span><Input value={botName} maxLength={64} onChange={(event) => setBotName(event.target.value)} placeholder="e.g. Kathmandu Support" className="h-12 rounded-xl bg-background/60" /><span className="text-[11px] text-muted-foreground">2–64 letters, numbers, spaces, hyphens, or underscores.</span></label>
            <label className="space-y-2"><span className="text-xs font-medium text-foreground">Country / calling code</span><select value={countryIso} onChange={(event) => { setCountryIso(event.target.value as typeof countryIso); setNationalNumber(""); }} className="h-12 w-full rounded-xl border border-input bg-background/60 px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"><option value="" disabled>Select a country</option>{countries.map((item) => <option key={item.iso} value={item.iso}>{item.flag} {item.name} (+{item.dial})</option>)}</select></label>
            <label className="space-y-2"><span className="text-xs font-medium text-foreground">National phone number</span><div className="flex h-12 overflow-hidden rounded-xl border border-input bg-background/60 focus-within:ring-2 focus-within:ring-ring"><span className="flex items-center border-r border-border px-3 mono text-xs text-primary">+{country.dial}</span><input inputMode="tel" value={nationalNumber} maxLength={20} onChange={(event) => setNationalNumber(formatNational(event.target.value, countryIso))} placeholder={country.placeholder} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" /></div></label></div>
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/35 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-medium">Normalized preview</p><p className="mono mt-1 text-sm text-primary">{e164Preview}</p><p className="mt-1 text-[11px] text-muted-foreground">National formatting is for readability; E.164 is validated server-side.</p></div><Button disabled={createProfile.isPending || botName.trim().length < 2 || digits.length < 4} onClick={handleCreate} className="h-11 rounded-xl px-5">{createProfile.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Validate & create</Button></div>
          {!isAuthenticated && <button onClick={() => startLogin()} className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-left text-xs text-muted-foreground transition hover:bg-primary/10"><span><span className="font-semibold text-foreground">Owner sign-in required.</span> You can review the flow now; saving or pairing stays locked until you authenticate.</span><ChevronRight className="size-4 text-primary" /></button>}
        </CardContent></Card>

        <Card className="border-border/70 bg-card/80 shadow-xl shadow-black/10"><CardContent className="p-5 md:p-7"><div className="mb-6 flex items-start justify-between"><div><p className="mono text-[11px] uppercase tracking-[.15em] text-primary">Linked-device flow</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Pair safely, step by step</h2></div><KeyRound className="size-5 text-primary" /></div>
          <div className="space-y-3">{[
            { n: "01", title: "Create & validate", text: "Save a profile only after strict E.164 validation succeeds.", done: Boolean(selectedProfile) },
            { n: "02", title: "Request a temporary code", text: "NEP BOT starts a server-side linked-device session and shows a short-lived code without storing it.", done: Boolean(pairingCode) },
            { n: "03", title: "Confirm in WhatsApp", text: "On your phone, use Linked Devices → Link with phone number.", done: selectedProfile?.connectionStatus === "connected" },
          ].map((step) => <div key={step.n} className="flex gap-4 rounded-2xl border border-border/70 bg-background/30 p-4"><span className={cn("mono grid size-8 shrink-0 place-items-center rounded-lg text-xs", step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{step.done ? <Check className="size-4" /> : step.n}</span><div className="min-w-0"><p className="text-sm font-semibold">{step.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p></div></div>)}
          </div>
          {pairingCode ? <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/10 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-primary">Temporary pairing code</p><p className="mt-1 text-[11px] text-muted-foreground">Visible only in this session · expires in 60 seconds</p></div><Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(pairingCode); toast.success("Pairing code copied."); }} className="text-primary"><Copy className="size-4" /></Button></div><p className="mono mt-3 rounded-xl bg-background/60 px-3 py-3 text-center text-xl tracking-[.2em] text-foreground">{pairingCode}</p></div> : <div className="mt-5 rounded-2xl border border-dashed border-border bg-background/30 p-4 text-xs leading-5 text-muted-foreground">Choose a validated profile, then request a code. Your phone remains the final authority for every linked-device confirmation.</div>}
          <div className="mt-5 flex flex-wrap gap-3"><Button disabled={!selectedProfile || requestPairing.isPending} onClick={() => selectedProfile && requestPairing.mutate({ profileId: selectedProfile.id })} className="h-11 rounded-xl">{requestPairing.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}Generate pairing code</Button><Button disabled={!selectedProfile || disconnect.isPending} variant="outline" onClick={() => selectedProfile && disconnect.mutate({ profileId: selectedProfile.id })} className="h-11 rounded-xl border-border bg-transparent"><LockKeyhole className="mr-2 size-4" />Secure logout</Button></div>
        </CardContent></Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="border-border/70 bg-card/80"><CardContent className="p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mono text-[11px] uppercase tracking-[.15em] text-primary">Bot profiles</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Your connection workspace</h2></div><Badge variant="outline" className="rounded-lg py-1.5">{profilesQuery.data?.length ?? 0} saved</Badge></div>
          <div className="mt-6 grid gap-3">{profilesQuery.isLoading ? <div className="h-24 animate-pulse rounded-2xl bg-muted" /> : profilesQuery.data?.length ? profilesQuery.data.map((profile) => { const meta = statusMeta(profile.connectionStatus); const itemCountry = countries.find((item) => item.iso === profile.countryIso); return <button onClick={() => setSelectedProfileId(profile.id)} key={profile.id} className={cn("group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5", selectedProfile?.id === profile.id ? "border-primary/50 bg-primary/7" : "border-border/70 bg-background/25")}><div className="grid size-11 place-items-center rounded-xl bg-muted text-lg">{itemCountry?.flag ?? "🌐"}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{profile.botName}</p><span className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]", meta.className)}><span className={cn("size-1.5 rounded-full", meta.dot)} />{meta.label}</span></div><p className="mono mt-1 text-[11px] text-muted-foreground">{profile.phoneE164.replace(/.(?=.{4})/g, "•")} · Updated {formatTime(profile.updatedAt)}</p></div><ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" /></button>; }) : <div className="rounded-2xl border border-dashed border-border bg-background/25 px-5 py-9 text-center"><Bot className="mx-auto size-7 text-primary" /><p className="mt-3 text-sm font-semibold">No bot profile yet</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Start with a country-aware number setup. The dashboard will not request a pairing code until validation is complete.</p></div>}</div>
        </CardContent></Card>
        <Card className="border-border/70 bg-card/80"><CardContent className="p-5 md:p-7"><div className="flex items-start justify-between"><div><p className="mono text-[11px] uppercase tracking-[.15em] text-primary">Connection health</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">At a glance</h2></div><Radio className="size-5 text-primary" /></div><div className="mt-7 space-y-4"><div className="rounded-2xl bg-background/35 p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Session status</span><span className="flex items-center gap-1.5 text-xs font-medium"><span className={cn("size-2 rounded-full", profileStatus.dot)} />{profileStatus.label}</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", selectedProfile?.connectionStatus === "connected" ? "w-full bg-emerald-400" : selectedProfile ? "w-2/3 bg-primary" : "w-1/4 bg-muted-foreground/30")} /></div><Button disabled={!selectedProfile || syncStatus.isPending} onClick={() => selectedProfile && syncStatus.mutate({ profileId: selectedProfile.id })} variant="ghost" className="mt-3 h-8 w-full rounded-lg text-[11px] text-primary hover:bg-primary/10 hover:text-primary">{syncStatus.isPending ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <RefreshCw className="mr-2 size-3.5" />}Refresh connector status</Button></div><div className="rounded-2xl border border-border/70 bg-background/25 p-4"><p className="text-xs font-semibold">Data retained</p><p className="mt-2 text-xs leading-5 text-muted-foreground">Profile preferences, switches, and non-sensitive connection events. Pairing codes, session material, and credentials never appear in the dashboard database.</p></div></div></CardContent></Card>
      </section>

      <section id="commands" className="scroll-mt-6 grid gap-5 xl:grid-cols-[1.17fr_.83fr]">
        <Card className="border-border/70 bg-card/80"><CardContent className="p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mono text-[11px] uppercase tracking-[.15em] text-primary">Command catalog</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Clear commands, scoped access</h2><p className="mt-2 text-sm text-muted-foreground">Public commands stay useful. Moderation, group operations, and provider-backed AI remain owner scoped.</p></div><Button variant="outline" className="rounded-xl border-border bg-transparent" onClick={() => toast.message("The command catalog is synced from the server for signed-in owners.")}><TerminalSquare className="mr-2 size-4" />View all</Button></div>
          <div className="mt-6 overflow-hidden rounded-2xl border border-border/70"><div className="grid grid-cols-[1.1fr_.7fr_1.3fr_auto] gap-3 border-b border-border bg-muted/45 px-4 py-3 mono text-[10px] uppercase tracking-[.13em] text-muted-foreground"><span>Command</span><span>Scope</span><span className="hidden sm:block">Purpose</span><span /></div>{catalog.slice(0, 8).map((item) => <div key={item.command} className="grid grid-cols-[1.1fr_.7fr_1.3fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"><span className="mono truncate text-xs text-primary">{item.command}</span><Badge variant="outline" className="w-fit rounded-md px-1.5 py-0.5 text-[10px]">{item.access}</Badge><span className="hidden truncate text-xs text-muted-foreground sm:block">{item.description}</span><MoreHorizontal className="size-4 text-muted-foreground" /></div>)}</div>
        </CardContent></Card>
        <Card className="panel-sheen border-primary/20 bg-[linear-gradient(145deg,oklch(0.22_0.055_154_/_85%),oklch(0.145_0.024_157_/_90%))]"><CardContent className="p-5 md:p-7"><Sparkles className="size-5 text-primary" /><p className="mono mt-5 text-[11px] uppercase tracking-[.15em] text-primary">Optional AI control</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Bring your own provider key.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Enable <span className="mono text-primary">/ai</span> and controlled auto-reply only after adding a provider endpoint, model, and secret key in the deployment settings. The key never reaches the browser.</p><div className="mt-5 space-y-3 rounded-2xl border border-primary/20 bg-background/25 p-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary"><KeyRound className="size-4" /></div><div><p className="text-xs font-semibold">Provider setup test</p><p className="mt-1 text-[11px] text-muted-foreground">A configured key is checked server-side only.</p></div></div><Input value={aiPrompt} maxLength={500} onChange={(event) => setAiPrompt(event.target.value)} className="h-10 rounded-xl bg-background/45 text-xs" /><Button disabled={!isAuthenticated || aiPreview.isPending || !aiPrompt.trim()} onClick={() => aiPreview.mutate({ prompt: aiPrompt })} variant="secondary" className="h-10 w-full rounded-xl text-xs">{aiPreview.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Zap className="mr-2 size-4" />}Test /ai provider</Button>{aiResponse && <p className="rounded-xl border border-primary/15 bg-background/35 p-3 text-xs leading-5 text-foreground">{aiResponse}</p>}</div></CardContent></Card>
      </section>

      <section id="activity" className="scroll-mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Card className="border-border/70 bg-card/80"><CardContent className="p-5 md:p-7"><p className="mono text-[11px] uppercase tracking-[.15em] text-primary">Security guardrails</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Designed to reduce risk</h2><div className="mt-6 space-y-3">{safetyCards.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-3 rounded-2xl border border-border/70 bg-background/25 p-3.5"><div className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></div><div><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{text}</p></div></div>)}</div></CardContent></Card>
        <Card className="border-border/70 bg-card/80"><CardContent className="p-5 md:p-7"><div className="flex items-start justify-between"><div><p className="mono text-[11px] uppercase tracking-[.15em] text-primary">Non-sensitive activity</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Connection timeline</h2></div><Activity className="size-5 text-primary" /></div><div className="mt-6 space-y-1">{activityQuery.isLoading ? <div className="h-28 animate-pulse rounded-2xl bg-muted" /> : activity.length ? activity.map((event) => <div className="flex gap-3 rounded-xl px-3 py-3 hover:bg-muted/35" key={event.id}><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0 flex-1"><p className="text-xs font-medium">{event.summary}</p><p className="mono mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{event.eventType.replace(/_/g, " ")} · {formatTime(event.createdAt)}</p></div></div>) : <div className="rounded-2xl border border-dashed border-border bg-background/25 px-5 py-10 text-center"><Activity className="mx-auto size-6 text-primary" /><p className="mt-3 text-sm font-semibold">No connection activity yet</p><p className="mt-1 text-xs text-muted-foreground">Validated setup, pairing requests, and confirmed disconnects will appear here.</p></div>}</div></CardContent></Card>
      </section>

      <section id="owner-controls" className="scroll-mt-6"><Card className="border-border/70 bg-card/80"><CardContent className="p-5 md:p-7"><div className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-end md:justify-between"><div><p className="mono text-[11px] uppercase tracking-[.15em] text-primary">Owner controls</p><h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Intentional automations, clear states</h2><p className="mt-2 text-sm text-muted-foreground">Each switch is scoped to the selected profile and saved server-side for the owner only.</p></div>{selectedProfile ? <Badge className="w-fit border-primary/20 bg-primary/10 py-1.5 text-primary hover:bg-primary/10"><Bot className="mr-1.5 size-3.5" />{selectedProfile.botName}</Badge> : <Badge variant="outline" className="w-fit py-1.5">Select a profile to unlock</Badge>}</div>
        <div className="grid gap-4 pt-6 lg:grid-cols-2"><div className="rounded-2xl border border-border/70 bg-background/25 p-4"><div className="flex items-center justify-between gap-5"><div><p className="text-sm font-semibold">Command visibility</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Public mode lets approved public commands respond. Private mode limits command handling to the owner.</p></div><Switch disabled={!selectedProfile || updateMode.isPending} checked={selectedProfile?.publicMode ?? false} onCheckedChange={(checked) => selectedProfile && guardOwner() && updateMode.mutate({ profileId: selectedProfile.id, publicMode: checked })} /></div><p className="mt-4 mono text-[10px] uppercase tracking-[.13em] text-primary">{selectedProfile?.publicMode ? "Public mode enabled" : "Private owner-only mode"}</p></div>
          {[{ key: "antiLink" as const, title: "Anti-link", text: "Apply approved link moderation rules in enabled groups." }, { key: "antiCall" as const, title: "Anti-call", text: "Respond to incoming calls with a controlled message." }, { key: "autoRead" as const, title: "Auto-read", text: "Mark eligible incoming messages as read." }, { key: "autoReact" as const, title: "Auto-react", text: "React with configured safe defaults." }, { key: "groupControls" as const, title: "Group controls", text: "Enable owner-approved group utility commands." }, { key: "aiAutoReply" as const, title: "AI auto-reply", text: "Requires an owner-configured provider key and model." }].map((feature) => <div key={feature.key} className="rounded-2xl border border-border/70 bg-background/25 p-4"><div className="flex items-center justify-between gap-5"><div><p className="text-sm font-semibold">{feature.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{feature.text}</p></div><Switch disabled={!selectedProfile || updateFeatures.isPending} checked={Boolean(featureState?.[feature.key])} onCheckedChange={(checked) => handleFeature(feature.key, checked)} /></div><p className="mt-4 mono text-[10px] uppercase tracking-[.13em] text-muted-foreground">{featureState?.[feature.key] ? "Enabled" : "Disabled"}</p></div>)}
        </div>
      </CardContent></Card></section>

      <footer className="flex flex-col gap-3 border-t border-border/70 px-1 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>NEP BOT keeps you in control of pairing, profiles, and automation states.</p><p className="mono text-[10px] uppercase tracking-[.13em]">Build 01 · secure onboarding layer</p></footer>
    </div>
  );
}

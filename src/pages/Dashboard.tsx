import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  Factory,
  LogOut,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Background } from "@/components/landing/Background";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { faNumber } from "@/lib/fa";
import {
  PropertyFormDialog,
  type AiDraft,
  type PropertyInput,
} from "@/components/dashboard/PropertyFormDialog";
import { AiListingTab } from "@/components/dashboard/AiListingTab";
import { ApplicantsTab } from "@/components/dashboard/ApplicantsTab";
import type { Property } from "@/lib/estate";

const badgeStyles = {
  فروش: "bg-emerald-500/95 text-white",
  اجاره: "bg-orange-500/95 text-white",
} as const;

type Tab = "files" | "ai" | "applicants";

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "files", label: "فایل‌ها", icon: Building2 },
  { id: "ai", label: "ثبت با هوش مصنوعی", icon: Wand2 },
  { id: "applicants", label: "متقاضیان", icon: Users },
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const list = useQuery(api.properties.list);
  const create = useMutation(api.properties.create);
  const update = useMutation(api.properties.update);
  const remove = useMutation(api.properties.remove);

  const [tab, setTab] = useState<Tab>("files");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const stats = useMemo(() => {
    const items = list ?? [];
    return [
      {
        label: "کل فایل‌ها",
        value: faNumber(items.length),
        icon: Building2,
        tone: "bg-sky-100 text-primary ring-white/70",
      },
      {
        label: "فروش",
        value: faNumber(items.filter((p) => p.transaction === "فروش").length),
        icon: Tag,
        tone: "bg-emerald-100 text-emerald-700 ring-white/70",
      },
      {
        label: "اجاره",
        value: faNumber(items.filter((p) => p.transaction === "اجاره").length),
        icon: Tag,
        tone: "bg-orange-100 text-orange-600 ring-white/70",
      },
      {
        label: "صنعتی",
        value: faNumber(items.filter((p) => p.category === "صنعتی").length),
        icon: Factory,
        tone: "bg-indigo-100 text-indigo-700 ring-white/70",
      },
    ];
  }, [list]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const openCreate = () => {
    setEditing(null);
    setDraft(null);
    setFormOpen(true);
  };

  const openCreateFromAi = (aiDraft: AiDraft) => {
    setDraft(aiDraft);
    setEditing(null);
    setFormOpen(true);
    toast.success("اطلاعات توسط هوش مصنوعی استخراج شد", {
      description: "پیش از ثبت، فرم را بررسی و در صورت نیاز ویرایش کنید.",
    });
  };

  const openEdit = (property: Property) => {
    setEditing(property);
    setDraft(null);
    setFormOpen(true);
  };

  const handleSave = async (data: PropertyInput) => {
    setSaving(true);
    try {
      if (editing) {
        await update({ id: editing._id, ...data });
        toast.success("فایل به‌روزرسانی شد");
      } else {
        await create(data);
        toast.success("فایل جدید ثبت شد");
      }
      setFormOpen(false);
      setEditing(null);
      setDraft(null);
    } catch {
      toast.error("ذخیره با خطا مواجه شد. لطفا دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await remove({ id: deleting._id as Id<"properties"> });
      toast.success("فایل حذف شد");
      setDeleting(null);
    } catch {
      toast.error("حذف با خطا مواجه شد. لطفا دوباره تلاش کنید.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <Background />

      {/* header */}
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="/" className="shrink-0" aria-label="بازگشت به سایت">
            <Logo subtitle={false} />
          </a>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              className="hidden h-9 rounded-full px-3 text-xs font-bold text-navy hover:bg-white/70 sm:inline-flex"
            >
              <a href="/">
                <ExternalLink className="size-3.5" />
                مشاهده سایت
              </a>
            </Button>
            <span className="glass-soft hidden rounded-full px-3.5 py-1.5 text-xs font-bold text-navy md:inline-block">
              {user?.name ?? "مدیر"}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={handleSignOut}
              className="glass-soft h-9 rounded-full px-3.5 text-xs font-bold text-navy hover:bg-white/70"
            >
              <LogOut className="size-3.5" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        {/* heading */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              دپارتمان املاک شهریار
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-navy sm:text-3xl">
              پنل مدیریت
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              فایل‌های ملکی را ثبت و ویرایش کنید، با هوش مصنوعی از روی گفتار یا متن
              فایل بسازید و فایل‌های مناسب را به متقاضیان پیشنهاد دهید.
            </p>
          </div>
          {tab === "files" && (
            <Button
              onClick={openCreate}
              className="gold-gradient h-11 rounded-xl px-5 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgb(184_137_28/0.9)] ring-1 ring-white/60 transition hover:brightness-105"
            >
              <Plus className="size-4" />
              افزودن فایل جدید
            </Button>
          )}
        </div>

        {/* tabs */}
        <div className="glass-soft inline-flex max-w-full flex-wrap rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm",
                tab === t.id
                  ? "bg-primary text-white shadow-md"
                  : "text-navy hover:bg-white/70",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* files tab */}
        {tab === "files" && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="glass flex items-center gap-3 rounded-2xl p-4">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
                      stat.tone,
                    )}
                  >
                    <stat.icon className="size-5" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-lg font-extrabold text-navy">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass overflow-hidden rounded-[1.75rem]">
              {list === undefined ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-sky-100/80" />
                  ))}
                </div>
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                  <span className="glass-soft flex size-16 items-center justify-center rounded-2xl text-gold-deep">
                    <Building2 className="size-7" />
                  </span>
                  <div>
                    <p className="text-base font-extrabold text-navy">
                      هنوز فایلی ثبت نشده است
                    </p>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      اولین فایل را با دکمه «افزودن فایل جدید» یا از طریق «ثبت با هوش
                      مصنوعی» ثبت کنید.
                    </p>
                  </div>
                  <Button
                    onClick={openCreate}
                    className="gold-gradient h-10 rounded-full px-6 text-sm font-bold text-white shadow-md ring-1 ring-white/60"
                  >
                    <Plus className="size-4" />
                    افزودن فایل جدید
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-extrabold text-navy">
                        فایل
                      </TableHead>
                      <TableHead className="hidden text-xs font-extrabold text-navy md:table-cell">
                        معامله
                      </TableHead>
                      <TableHead className="hidden text-xs font-extrabold text-navy lg:table-cell">
                        دسته‌بندی
                      </TableHead>
                      <TableHead className="hidden text-xs font-extrabold text-navy lg:table-cell">
                        منطقه
                      </TableHead>
                      <TableHead className="text-xs font-extrabold text-navy">
                        قیمت
                      </TableHead>
                      <TableHead className="text-end text-xs font-extrabold text-navy">
                        عملیات
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((property) => (
                      <TableRow key={property._id} className="hover:bg-white/60">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={property.image}
                              alt=""
                              loading="lazy"
                              className="h-12 w-16 shrink-0 rounded-lg object-cover ring-1 ring-white/70"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.visibility = "hidden";
                              }}
                            />
                            <div className="min-w-0">
                              <p className="line-clamp-1 text-sm font-bold text-navy">
                                {property.title}
                              </p>
                              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                {property.location}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-1 text-[11px] font-bold",
                              badgeStyles[property.transaction],
                            )}
                          >
                            {property.transaction}
                          </span>
                        </TableCell>
                        <TableCell className="hidden text-xs font-medium text-muted-foreground lg:table-cell">
                          {property.category}
                        </TableCell>
                        <TableCell className="hidden text-xs font-medium text-muted-foreground lg:table-cell">
                          {property.area}
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-1 max-w-[150px] text-xs font-bold text-navy">
                            {property.price ?? faNumber(property.priceValue)}
                          </p>
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="ویرایش"
                              onClick={() => openEdit(property)}
                              className="size-9 rounded-lg text-primary hover:bg-white/80"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="حذف"
                              onClick={() => setDeleting(property)}
                              className="size-9 rounded-lg text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}

        {/* AI listing tab */}
        {tab === "ai" && (
          <div className="max-w-4xl">
            <AiListingTab onDraft={openCreateFromAi} />
          </div>
        )}

        {/* applicants tab */}
        {tab === "applicants" && <ApplicantsTab />}
      </div>

      {/* create / edit dialog */}
      <PropertyFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            setDraft(null);
          }
        }}
        property={editing}
        draft={draft}
        pending={saving}
        onSave={handleSave}
      />

      {/* delete confirmation */}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent className="glass max-w-md border-white/60">
          <AlertDialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <AlertDialogTitle className="text-navy">حذف فایل ملک</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleting?.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={removing}
              className="h-10 rounded-xl px-5 text-sm font-bold text-muted-foreground"
            >
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={removing}
              className="h-10 rounded-xl bg-destructive px-5 text-sm font-bold text-white hover:bg-destructive/90"
            >
              {removing ? "در حال حذف..." : "حذف فایل"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
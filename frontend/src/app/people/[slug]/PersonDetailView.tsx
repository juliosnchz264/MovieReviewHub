"use client";

import Image from "next/image";
import { User, Calendar, MapPin } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { usePerson } from "@/features/people/hooks/usePeople";
import { useTranslate } from "@/hooks/useTranslate";
import { useLocaleStore } from "@/store/locale";
import type { PersonCredit } from "@/types/person";

export function PersonDetailView({ personKey }: { personKey: string }) {
  const t = useTranslate();
  const locale = useLocaleStore((s) => s.locale);

  const { data: person, isLoading, isError } = usePerson(personKey || null);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-12">
          <PersonDetailSkeleton />
        </main>
      </>
    );
  }

  if (isError || !person) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-4 py-12">
          <p className="text-center text-muted-foreground">{t("people.notFound")}</p>
        </main>
      </>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const age = computeAge(person.birthday, person.deathday);

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-12">
        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          <div>
            <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-border bg-muted">
              {person.profileUrl ? (
                <Image
                  src={person.profileUrl}
                  alt={person.name}
                  fill
                  sizes="(max-width: 768px) 80vw, 260px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <User className="size-12" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{person.name}</h1>
              {person.knownForDepartment && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {person.knownForDepartment}
                </p>
              )}
            </div>

            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {person.birthday && (
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-muted-foreground">{t("people.birthday")}</dt>
                    <dd>
                      {dateFmt.format(new Date(person.birthday))}
                      {age !== null && !person.deathday && (
                        <span className="text-muted-foreground"> ({age})</span>
                      )}
                    </dd>
                  </div>
                </div>
              )}
              {person.deathday && (
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-muted-foreground">{t("people.deathday")}</dt>
                    <dd>{dateFmt.format(new Date(person.deathday))}</dd>
                  </div>
                </div>
              )}
              {person.placeOfBirth && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <dt className="text-muted-foreground">{t("people.placeOfBirth")}</dt>
                    <dd>{person.placeOfBirth}</dd>
                  </div>
                </div>
              )}
            </dl>

            {person.biography && (
              <section>
                <h2 className="text-lg font-medium">{t("people.biography")}</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                  {person.biography}
                </p>
              </section>
            )}
          </div>
        </div>

        {person.credits.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-medium">{t("people.knownFor")}</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {person.credits.map((credit) => (
                <CreditCard key={`${credit.mediaType}-${credit.tmdbId}`} credit={credit} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function CreditCard({ credit }: { credit: PersonCredit }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-2/3 bg-muted">
        {credit.posterUrl ? (
          <Image
            src={credit.posterUrl}
            alt={credit.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
            —
          </div>
        )}
      </div>
      <div className="p-2">
        <h3 className="line-clamp-1 text-xs font-medium">{credit.title}</h3>
        <p className="line-clamp-1 text-[11px] text-muted-foreground">
          {credit.character || credit.job || "—"}
          {credit.releaseDate ? ` • ${credit.releaseDate.slice(0, 4)}` : ""}
        </p>
      </div>
    </div>
  );
}

function PersonDetailSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-[260px_1fr]">
      <div className="aspect-2/3 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-4">
        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

function computeAge(birthday: string | null, deathday: string | null): number | null {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

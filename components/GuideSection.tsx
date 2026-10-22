import { Camera, FileSpreadsheet, FolderOpen } from 'lucide-react';

const STEPS = [
  {
    icon: Camera,
    title: 'Foto langsung di tempat',
    body: 'Foto wajib diambil saat itu lewat kamera (tanpa unggah berkas). Cap waktu WIB otomatis tertanam di dalam foto.',
    meta: 'Kamera + cap waktu',
  },
  {
    icon: FolderOpen,
    title: 'Tersimpan ke Drive',
    body: 'Foto masuk folder Dokumentasi Penetasan. Sheet hanya mencatat nama berkas referensinya (nama + NIM), tanpa tautan.',
    meta: 'nama-nim-shift',
  },
  {
    icon: FileSpreadsheet,
    title: 'Tercatat di Sheet',
    body: 'Waktu, nama, NIM, shift, status, dan tautan foto tercatat di DataAbsenPenetasan. Baris tambahan admin ditandai "Manual".',
    meta: '7 kolom',
  },
];

export function GuideSection() {
  return (
    <section id="panduan" className="scroll-mt-24 border-y border-ink-100 bg-surface/70">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="label-caps">Cara kerja</p>
        <h2 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Tiga langkah, selesai
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-100 text-forest-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="num font-mono text-xs text-ink-300">0{index + 1}</span>
                </div>
                <h3 className="font-display mt-4 text-lg font-bold text-ink-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{step.body}</p>
                <p className="num mt-4 inline-block rounded-full bg-ink-100 px-2.5 py-1 font-mono text-[11px] text-ink-500">
                  {step.meta}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

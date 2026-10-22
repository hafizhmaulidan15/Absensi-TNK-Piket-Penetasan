'use client';

import { StudentForm } from '@/components/StudentForm';

export function AbsensiWorkspace() {
  return (
    <section id="absen" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <StudentForm />
      </div>
    </section>
  );
}

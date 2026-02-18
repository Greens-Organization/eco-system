import { HomeButton } from '@/components/home-button';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-orange-50">
      <div className="flex flex-col items-center gap-4 px-6">
        <h2 className="font-semibold text-2xl text-orange-950">
          Pagina não encontrada!
        </h2>
        <p className="text-lg text-orange-950">
          A página que você está procurando não existe ou foi movida.
        </p>
      </div>
    </div>
  );
}

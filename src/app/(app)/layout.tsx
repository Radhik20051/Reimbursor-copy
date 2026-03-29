import { Navbar } from "@/components/Navbar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="container mx-auto py-8 px-4">{children}</main>
    </>
  )
}

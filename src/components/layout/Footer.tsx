import { Container } from "./Container";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-gradient-burgundy text-primary-foreground">
      <Container>
        <div className="grid gap-6 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <div className="font-display text-base font-semibold tracking-wide">
              MRS STAFF COOP STORE
            </div>
            <p className="mt-1 text-sm text-primary-foreground/75">
              Powering Smarter Shopping for MRS Staff Cooperative Members
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-accent-soft sm:text-right">
            Designed and Powered By{" "}
            <span className="font-semibold text-accent">LiveGig Ltd</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}

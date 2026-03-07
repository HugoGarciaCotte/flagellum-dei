interface FullPageLoaderProps {
  message?: string;
}

const FullPageLoader = ({ message = "Loading..." }: FullPageLoaderProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse-glow text-primary font-display text-xl">{message}</div>
    </div>
  );
};

export default FullPageLoader;

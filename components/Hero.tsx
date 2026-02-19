"use client";

export default function Hero() {
  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      id="hero"
      className="relative flex items-end justify-start bg-cover bg-center text-white w-full overflow-hidden min-h-[85vh] md:min-h-[90vh] pt-24 pb-0 px-5 md:px-10 bg-[#141414]"
      style={{
        backgroundImage: "linear-gradient(to top, #141414 0%, transparent 30%), linear-gradient(to right, #141414 20%, transparent 60%)",
      }}
    >
      <div className="relative z-10 max-w-[1000px] w-full py-10 md:py-14">
        <h1 className="text-4xl md:text-5xl font-bold mb-2.5">
          Vitaliy Pikalo
        </h1>
        <p className="text-base mb-5 max-w-xl">
          Computer Engineering Student • Builder • Competitor. I build
          high-performance software, systems, and products — fast. Pennsylvania, USA.
        </p>
        <div className="flex gap-2.5 flex-wrap">
          <button
            onClick={() => scrollTo("#projects")}
            className="flex items-center justify-center px-5 py-2.5 rounded bg-[#e50914] font-bold text-white border-none cursor-pointer transition-colors hover:bg-[#b81d24]"
          >
            View Projects
          </button>
          <button
            onClick={() => scrollTo("#contact")}
            className="flex items-center justify-center px-5 py-2.5 rounded font-bold text-white border-none cursor-pointer bg-[rgba(109,109,110,0.7)] transition-colors hover:bg-[#b81d24]"
          >
            Contact
          </button>
        </div>
      </div>
    </section>
  );
}

const gridImages = {
  row1: [
    "https://images.unsplash.com/photo-1664575602554-208c7a2246b8?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1600607686527-6fb886090705?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1599809275372-baba0089d33b?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1531835551805-16d864c8d311?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60",
  ],
  row2: [
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1581094794329-cd56b5095a68?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1534237710431-e2fc698436d5?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1565514020125-978d63654497?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1558442074-3c1926663753?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1628151016020-0062f6d0426b?w=500&auto=format&fit=crop&q=60",
  ],
  row3: [
    "https://images.unsplash.com/photo-1574359411659-15573a21cccf?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1518005052357-e98433018e48?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=500&auto=format&fit=crop&q=60",
  ],
};

function GridItem({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="grid-item relative w-full h-full overflow-hidden rounded-lg bg-white shadow-sm border border-slate-200">
      <div
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />
    </div>
  );
}

export function AnimatedPhotoGrid() {
  return (
    <div className="perspective-frame w-full h-[650px] flex items-center justify-center bg-slate-50">
      <div className="perspective-inner w-full h-full opacity-80">
        <div className="grid-container h-full grid grid-rows-3 gap-4 p-4">
          {/* Row 1 - floatRight animation */}
          <div className="grid gap-4 grid-cols-6 row-animate-right">
            {gridImages.row1.map((url, index) => (
              <GridItem key={`row1-${index}`} imageUrl={url} />
            ))}
          </div>

          {/* Row 2 - floatLeft animation */}
          <div className="grid gap-4 grid-cols-6 row-animate-left">
            {gridImages.row2.map((url, index) => (
              <GridItem key={`row2-${index}`} imageUrl={url} />
            ))}
          </div>

          {/* Row 3 - floatRight animation */}
          <div className="grid gap-4 grid-cols-6 row-animate-right-slow">
            {gridImages.row3.map((url, index) => (
              <GridItem key={`row3-${index}`} imageUrl={url} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

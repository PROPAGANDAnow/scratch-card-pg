/**
 * Canvas pooling utility for better performance
 * Reuses canvas elements to reduce memory allocation
 */
class CanvasPool {
  private canvases: HTMLCanvasElement[] = [];
  private maxPoolSize = 5;

  getCanvas(): HTMLCanvasElement {
    if (this.canvases.length > 0) {
      return this.canvases.pop()!;
    }
    
    const canvas = document.createElement('canvas');
    // Pre-configure canvas for optimal performance
    canvas.style.willChange = 'transform';
    canvas.style.transform = 'translateZ(0)'; // Force GPU acceleration
    return canvas;
  }

  returnCanvas(canvas: HTMLCanvasElement): void {
    if (this.canvases.length < this.maxPoolSize) {
      // Clear the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      this.canvases.push(canvas);
    }
  }

  clear(): void {
    this.canvases = [];
  }
}

export const canvasPool = new CanvasPool();

import { Skeleton, SkeletonText, SkeletonCard } from './Skeleton';

export function SkeletonDemo() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Skeleton Component Demo</h2>
        <p className="text-neutral-gray mb-6">
          Demonstrating the enhanced wave animation with gradient background and accessibility features.
        </p>
      </div>

      {/* Animation Variants */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Animation Variants</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Pulse Animation</h4>
            <Skeleton className="h-20 w-full" animation="pulse" />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Wave Animation (Enhanced)</h4>
            <Skeleton className="h-20 w-full" animation="wave" />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">No Animation</h4>
            <Skeleton className="h-20 w-full" animation="none" />
          </div>
        </div>
      </div>

      {/* Shape Variants */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Shape Variants</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Text (Rounded)</h4>
            <Skeleton className="h-20 w-full" variant="text" animation="wave" />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Circular</h4>
            <Skeleton className="h-20 w-20" variant="circular" animation="wave" />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Rectangular</h4>
            <Skeleton className="h-20 w-full" variant="rectangular" animation="wave" />
          </div>
        </div>
      </div>

      {/* SkeletonText Component */}
      <div>
        <h3 className="text-lg font-semibold mb-3">SkeletonText Component</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">3 Lines (Default)</h4>
            <SkeletonText animation="wave" />
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">5 Lines</h4>
            <SkeletonText lines={5} animation="wave" />
          </div>
        </div>
      </div>

      {/* SkeletonCard Component */}
      <div>
        <h3 className="text-lg font-semibold mb-3">SkeletonCard Component</h3>
        <SkeletonCard animation="wave" />
      </div>

      {/* Accessibility Information */}
      <div className="bg-neutral-light-gray p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Accessibility Features</h3>
        <ul className="text-sm text-neutral-gray space-y-1">
          <li>• All skeleton elements include <code>aria-hidden=&quot;true&quot;</code></li>
          <li>• Interactive elements include <code>tabIndex={-1}</code></li>
          <li>• Enhanced wave animation with wide gradient background</li>
          <li>• Proper background-size (200% width) for smooth animation</li>
          <li>• Assistive technology will skip these decorative elements</li>
        </ul>
      </div>
    </div>
  );
}

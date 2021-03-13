import {
  Anchor,
  WritingMode,
  CssStyleSheet,
  DomCallbackContext,
  LogicalSize,
  PhysicalSize,
  ILogicalNode,
  IFlowRootFormatContext,
} from 'nehan';

interface AnchorPos { left: number; top: number; }

function createPreviewContainerDOM(padding: number): HTMLElement {
  const div = document.createElement("div");
  div.style.padding = `${padding}px`;
  div.style.border = "1px solid #dadada";
  div.style.position = "absolute";
  div.style.background = "white";
  div.style.zIndex = "100";
  return div;
}

function createAnchorTargetDOM(original: HTMLElement): HTMLElement {
  const cloneDOM = original.cloneNode(true) as HTMLElement;
  cloneDOM.style.left = "";
  cloneDOM.style.top = "";
  cloneDOM.style.right = "";
  cloneDOM.style.bottom = "";
  cloneDOM.style.position = "relative";
  cloneDOM.style.color = "black";
  return cloneDOM;
}

function getBodySize(flowRoot: IFlowRootFormatContext): PhysicalSize {
  return new LogicalSize({
    measure: flowRoot.maxMeasure,
    extent: flowRoot.maxExtent
  }).getPhysicalSize(flowRoot.env.writingMode);
}

function getLogicalNodeSize(node: ILogicalNode): PhysicalSize {
  return new LogicalSize({
    measure: node.measure,
    extent: node.extent,
  }).getPhysicalSize(node.env.writingMode);
}

function getPreviewSize(anchorTargetNode: ILogicalNode, spacing: number): PhysicalSize {
  const size = getLogicalNodeSize(anchorTargetNode);
  size.width += spacing;
  size.height += spacing;
  return size;
}

function isPreviewEnable(anchorLinkDOM: HTMLElement, previewContDOM: HTMLElement): boolean {
  return anchorLinkDOM.contains(previewContDOM);
}

function deletePreview(anchorLinkDOM: HTMLElement, previewContDOM: HTMLElement) {
  if (isPreviewEnable(anchorLinkDOM, previewContDOM)) {
    anchorLinkDOM.removeChild(previewContDOM);
  }
}

function getAnchorLinkPos(flowRoot: IFlowRootFormatContext, node: ILogicalNode): AnchorPos {
  const bodySize = getBodySize(flowRoot);
  const offsetPos = node.boxPos.offsetPos;
  const mode = node.env.writingMode;
  if (mode.isTextHorizontal()) {
    return {
      left: offsetPos.start,
      top: offsetPos.before,
    };
  }
  if (mode.isVerticalRl()) {
    return {
      // In vertical-rl, 'before' means "right: <before>px".
      left: bodySize.width - offsetPos.before - node.extent,
      top: offsetPos.start,
    };
  }
  return {
    left: offsetPos.before,
    top: offsetPos.start,
  };
}

function getPreviewPos(
  writingMode: WritingMode,
  bodySize: PhysicalSize,
  anchorLinkPos: AnchorPos,
  anchorLinkSize: PhysicalSize,
  previewSize: PhysicalSize,
  spacingSize: number): AnchorPos {
  const ax = anchorLinkPos.left, ay = anchorLinkPos.top;
  const aw = anchorLinkSize.width, ah = anchorLinkSize.height;
  const pw = previewSize.width, ph = previewSize.height;
  const bw = bodySize.width, bh = bodySize.height;
  const ss = spacingSize;
  let left = ax, top = ay;
  if (writingMode.isTextHorizontal()) {
    const rightOver = Math.max(0, ax + pw - bw);
    const downOver = Math.max(0, ay + ah + ph - bh);
    const upOver = Math.max(0, ph - ay);
    left = (rightOver > 0) ? 0 : ax;
    top = (downOver > upOver) ? -(ph + ss * 2) : (ah + ss);
  } else {
    const rightOver = Math.max(0, ax + aw + pw - bw);
    const leftOver = Math.max(0, pw - ax);
    const downOver = Math.max(0, ay + ph - bh);
    // console.log(`downOver:${ay + ph - bh}, ay = ${ay}, ph = ${ph}, bh = ${bh}`);
    if (writingMode.isVerticalRl()) {
      left = (leftOver > rightOver) ? aw + ss : -(pw + 2 * ss);
    } else {
      left = (rightOver > leftOver) ? -(pw + 2 * ss) : aw + ss;
    }
    top = (downOver > 0) ? 0 : ay;
  }
  return { left, top };
}

export function create(args: {
  previewSpacing: number;
  onClickAnchorLink: (anchor: Anchor) => void;
}): CssStyleSheet {
  return new CssStyleSheet({
    "a[href^='#']": {
      "@create": (ctx: DomCallbackContext) => {
        // console.log("@create anchor:", ctx);
        const href = ctx.box.env.element.getAttribute("href") || "";
        const anchorName = href.substring(1);
        const anchorLinkDOM = ctx.dom;
        const previewContDOM = createPreviewContainerDOM(args.previewSpacing);
        const writingMode = ctx.box.env.writingMode;
        const bodySize = getBodySize(ctx.flowRoot);

        // console.log("create anchor(%s), target:%o", href, anchor);
        anchorLinkDOM.addEventListener("click", (e: Event) => {
          e.preventDefault();
          const anchor = ctx.flowRoot.getAnchor(anchorName);
          if (!anchor) {
            return false;
          }
          deletePreview(anchorLinkDOM, previewContDOM);
          args.onClickAnchorLink(anchor);
          // console.log("click:%o,%o", e, ctx);
          return false;
        });

        anchorLinkDOM.addEventListener("setpage", (e: Event) => {
          deletePreview(anchorLinkDOM, previewContDOM);
        });

        anchorLinkDOM.onmouseover = (e) => {
          if (isPreviewEnable(anchorLinkDOM, previewContDOM)) {
            return;
          }
          const anchor = ctx.flowRoot.getAnchor(anchorName);
          if (!anchor || !anchor.box) {
            return;
          }
          if (anchor.box.extent === 0) {
            return;
          }
          if (anchor.box && !anchor.dom) {
            const etor = ctx.flowRoot.createLogicalNodeEvaluator();
            anchor.dom = anchor.box.acceptEvaluator(etor) as HTMLElement;
          }
          if (anchor.dom && previewContDOM.childElementCount === 0) {
            const anchorTargetDOM = createAnchorTargetDOM(anchor.dom);
            previewContDOM.appendChild(anchorTargetDOM);
          }
          const anchorLinkPos = getAnchorLinkPos(ctx.flowRoot, ctx.box);
          const anchorLinkSize = getLogicalNodeSize(ctx.box);
          const previewSize = getPreviewSize(anchor.box, args.previewSpacing);
          const previewPos = getPreviewPos(writingMode, bodySize, anchorLinkPos, anchorLinkSize, previewSize, args.previewSpacing);

          previewContDOM.style.left = `${previewPos.left}px`;
          previewContDOM.style.top = `${previewPos.top}px`;

          anchorLinkDOM.appendChild(previewContDOM);
        };

        anchorLinkDOM.onmouseout = (e) => {
          deletePreview(anchorLinkDOM, previewContDOM);
        };
      },
    }
  });
}


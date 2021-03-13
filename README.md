# nehan-anchor

[nehan](https://github.com/tategakibunko/nehan-anchor) plugin for preview anchor link.

```typescript
import { Anchor } from 'nehan';
import * as AnchorStyle from 'nehan-anchor';
const style = AnchorStyle.create({
  previewSpacing: 10,
  onClickAnchorLink(anchor: Anchor){
    console.log("click anchor:", anchor);
  }
});
```

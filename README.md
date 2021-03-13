# nehan-anchor

[nehan](https://github.com/tategakibunko/nehan) plugin for preview anchor link.

## create nehan style

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

## use markup

```html
<blockquote id="bq1">some blockquoted text with id attribute</blockquote>

And you can preview it by creating anchor link like <a href="#bq1">this</a>.
```

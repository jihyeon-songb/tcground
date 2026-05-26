import {Button} from '@tcground/headless-ui';

export default function AsChildExample() {
  return (
    <Button asChild variant="secondary">
      <a href="https://headlessui.com/" rel="noreferrer" target="_blank">
        링크로 이동
      </a>
    </Button>
  );
}

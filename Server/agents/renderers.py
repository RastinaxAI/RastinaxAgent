from rest_framework.negotiation import DefaultContentNegotiation
from rest_framework.renderers import JSONRenderer


class IgnoreAcceptContentNegotiation(DefaultContentNegotiation):
    """
    Chat endpoint returns StreamingHttpResponse directly.

    بنابراین برای جلوگیری از 406، Accept header کلاینت
    را در مرحله DRF negotiation نادیده می‌گیریم.

    JSONRenderer فقط برای خطاهای عادی DRF استفاده می‌شود.
    """

    def select_renderer(
        self,
        request,
        renderers,
        format_suffix=None,
    ):
        renderer = JSONRenderer()

        return (
            renderer,
            renderer.media_type,
        )
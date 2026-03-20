import 'package:flutter/material.dart';

class DiscountCodeSection extends StatefulWidget {
  final String? discountCode;
  final bool isApplying;
  final String? error;
  final Function(String) onApplyDiscount;
  final VoidCallback onRemoveDiscount;

  const DiscountCodeSection({
    super.key,
    this.discountCode,
    required this.isApplying,
    this.error,
    required this.onApplyDiscount,
    required this.onRemoveDiscount,
  });

  @override
  State<DiscountCodeSection> createState() => _DiscountCodeSectionState();
}

class _DiscountCodeSectionState extends State<DiscountCodeSection> {
  final TextEditingController _controller = TextEditingController();
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    if (widget.discountCode != null) {
      _controller.text = widget.discountCode!;
      _isExpanded = true;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header with expand/collapse
        InkWell(
          onTap: () {
            setState(() {
              _isExpanded = !_isExpanded;
            });
          },
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              children: [
                Icon(
                  Icons.local_offer_outlined,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 8),
                Text(
                  'Discount Code',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                if (widget.discountCode != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Applied',
                      style: TextStyle(
                        color: Colors.green[700],
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                Icon(
                  _isExpanded ? Icons.expand_less : Icons.expand_more,
                  color: Colors.grey[600],
                ),
              ],
            ),
          ),
        ),
        
        // Expandable content
        if (_isExpanded) ...[
          const SizedBox(height: 8),
          
          if (widget.discountCode != null) ...[
            // Applied discount code
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.05),
                border: Border.all(color: Colors.green.withOpacity(0.3)),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.check_circle,
                    color: Colors.green[600],
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Discount Applied',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: Colors.green[700],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(
                          'Code: ${widget.discountCode}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.green[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: widget.onRemoveDiscount,
                    child: Text(
                      'Remove',
                      style: TextStyle(color: Colors.red[600]),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            // Discount code input
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Enter discount code',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      errorText: widget.error,
                    ),
                    textCapitalization: TextCapitalization.characters,
                    onSubmitted: (value) {
                      if (value.isNotEmpty) {
                        widget.onApplyDiscount(value);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: widget.isApplying || _controller.text.isEmpty
                      ? null
                      : () => widget.onApplyDiscount(_controller.text),
                  child: widget.isApplying
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Apply'),
                ),
              ],
            ),
            
            const SizedBox(height: 8),
            
            // Discount code suggestions
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                _DiscountChip(
                  code: 'WELCOME10',
                  description: '10% off first order',
                  onTap: () {
                    _controller.text = 'WELCOME10';
                    widget.onApplyDiscount('WELCOME10');
                  },
                ),
                _DiscountChip(
                  code: 'WHOLESALE',
                  description: 'Wholesale pricing',
                  onTap: () {
                    _controller.text = 'WHOLESALE';
                    widget.onApplyDiscount('WHOLESALE');
                  },
                ),
              ],
            ),
          ],
        ],
      ],
    );
  }
}

class _DiscountChip extends StatelessWidget {
  final String code;
  final String description;
  final VoidCallback onTap;

  const _DiscountChip({
    required this.code,
    required this.description,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Theme.of(context).primaryColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).primaryColor.withOpacity(0.3),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              code,
              style: TextStyle(
                color: Theme.of(context).primaryColor,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
            Text(
              description,
              style: TextStyle(
                color: Theme.of(context).primaryColor,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}